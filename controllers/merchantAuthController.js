import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendOTPEmail, sendPasswordResetEmail } from '../services/sendEmail.js';
import { generateOTP, generateJWT, generateTempToken } from '../utils/helpers.js';


// Step 1: Merchant initiates registration with email only - UPDATED
export const merchantInitiateRegistration = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("📧 Merchant Registration Initiated for:", email);

    // Validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // If merchant already registered but not verified
      if (existingUser.userType === 'merchant' && existingUser.status === 'pending_verification') {
        // Resend OTP
        const otp = generateOTP();
        existingUser.verificationCode = otp;
        existingUser.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        await existingUser.save();
        
        try {
          // Send OTP email
          await sendOTPEmail(email, otp, email.split('@')[0]);
          
          return res.status(200).json({
            success: true,
            message: 'OTP resent to email',
            userId: existingUser._id,
            status: existingUser.status
          });
        } catch (emailError) {
          console.error('Failed to send OTP email:', emailError);
          return res.status(500).json({
            success: false,
            error: 'Failed to send OTP. Please try again.'
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        userId: existingUser._id,
        userType: existingUser.userType,
        status: existingUser.status
      });
    }

    // Create new merchant user without password
    const otp = generateOTP();
    const newUser = new User({
      email,
      userType: 'merchant',
      status: 'pending_verification',
      verificationCode: otp,
      verificationExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await newUser.save();

    try {
      // Send OTP email with HTML template
      await sendOTPEmail(email, otp, email.split('@')[0]);
      
      console.log(`✅ OTP sent to ${email}`);
      
      res.status(201).json({
        success: true,
        message: 'OTP sent to email',
        userId: newUser._id,
        email: newUser.email,
        status: newUser.status
      });
      
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      
      // Rollback user creation if email fails
      await User.findByIdAndDelete(newUser._id);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Merchant registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};


// Step 2: Verify OTP
export const merchantVerifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    console.log(`🔍 Verifying OTP for User ID: ${userId} and OTP: ${otp}`);

    // Validation
    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'User ID and OTP are required'
      });
    }

    // Find user
    const user = await User.findById(userId);

    console.log(`🔍 Found user: ${user ? user.email : 'No user found'}`);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is a merchant
    if (user.userType !== 'merchant') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user type'
      });
    }

    console.log(`🔍 User verification status: ${user.isEmailVerified}`);

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }


    console.log(`🔍 Stored OTP: ${user.verificationCode}, Expiry: ${user.verificationExpiry}`);

    // Check OTP
    if (!user.verificationCode || !user.verificationExpiry) {
      return res.status(400).json({
        success: false,
        error: 'No pending verification'
      });
    }


    console.log(`🔍 Current time: ${new Date()}, OTP Expiry time: ${user.verificationExpiry}`);

    // Check OTP expiry
    if (user.verificationExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'OTP expired. Please request a new one.'
      });
    }

    console.log(`🔍 Comparing OTPs: provided ${otp} vs stored ${user.verificationCode}`);

    // Verify OTP
    if (user.verificationCode !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    console.log(`✅ OTP verified for user: ${user.email}`);

    // Update user
    user.isEmailVerified = true;
    user.status = 'pending_password';
    user.verificationCode = undefined;
    user.verificationExpiry = undefined;
    user.updatedAt = new Date();

    console.log(`🔄 Updating user status to 'pending_password'`);
    
    await user.save();

    console.log(`✅ User updated successfully: ${user.email}`);

    // Generate temporary token for password setup
    // const tempToken = generateTempToken(user._id, user.userType);

    // console.log(`🔑 Generated temporary token for password setup`, tempToken);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      // token: tempToken,
      userId: user._id,
      status: user.status,
      nextStep: 'set_password'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.'
    });
  }
};

// Step 3: Set Password after OTP verification - UPDATED WITH MANUAL HASHING
export const merchantSetPassword = async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;

    // Validation
    if (!userId || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is a merchant
    if (user.userType !== 'merchant') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user type'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email not verified. Please verify your email first.'
      });
    }

    // Check if already has password
    if (user.password) {
      return res.status(400).json({
        success: false,
        error: 'Password already set'
      });
    }

    // MANUAL PASSWORD HASHING
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set hashed password and update status
    user.password = hashedPassword;
    user.status = 'pending_approval'; // Ready for business details
    user.updatedAt = new Date();
    
    await user.save();

    // Generate JWT token for session
    const token = generateJWT(user._id, user.userType, user.status);

    res.status(200).json({
      success: true,
      message: 'Password set successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        status: user.status
      },
      nextStep: 'business_details'
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set password. Please try again.'
    });
  }
};

// Helper: Resend OTP
export const merchantResendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.verificationCode = otp;
    user.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.updatedAt = new Date();
    
    await user.save();

    // Send OTP email (simulated)
    console.log(`New OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      userId: user._id
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  }
};

// Helper: Check Registration Status
export const checkMerchantStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
};

// Helper: Verify temporary token (for password setup)
// export const verifyTempToken = async (req, res) => {
//   try {
//     const { token } = req.body;

//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         error: 'Token is required'
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');
    
//     if (!decoded.temp) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid token type'
//       });
//     }

//     // Check if user exists
//     const user = await User.findById(decoded.id);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found'
//       });
//     }

//     // Check if user is at correct step
//     if (user.status !== 'pending_password') {
//       return res.status(400).json({
//         success: false,
//         error: 'Cannot set password at this stage'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Token is valid',
//       userId: user._id,
//       email: user.email
//     });

//   } catch (error) {
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         error: 'Token expired. Please restart the password setup process.'
//       });
//     }
    
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid token'
//       });
//     }
    
//     console.error('Token verification error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Token verification failed'
//     });
//   }
// };

// Helper: Login for users (supports merchants, customers, admins)
export const merchantLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user (any user type)
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user has password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Please complete your registration'
      });
    }

    // MANUAL PASSWORD COMPARISON
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Allow login based on user type and status
    let allowedStatuses = ['active'];

    if (user.userType === 'merchant') {
      // Merchants can login during registration and when active
      allowedStatuses = ['pending_approval', 'active', 'pending_password'];
    }
    
    if (!allowedStatuses.includes(user.status)) {
      let errorMessage = '';
      switch (user.status) {
        case 'pending_verification':
          errorMessage = 'Please verify your email first';
          break;
        case 'suspended':
          errorMessage = 'Account is suspended. Contact support.';
          break;
        case 'rejected':
          errorMessage = 'Application was rejected. Contact support.';
          break;
        default:
          errorMessage = 'Account not ready for login';
      }
      
      return res.status(403).json({
        success: false,
        error: errorMessage,
        status: user.status
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token with user status in payload
    const token = generateJWT(
      user._id, 
      user.userType,
      user.status  // Include status in JWT
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        status: user.status,
        canAccessRegistration: user.status === 'pending_approval',
        canAccessDashboard: user.status === 'active'
      }
    });

  } catch (error) {
    console.error('Merchant login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
};

// Helper: Forgot password for merchants (secure, production-ready)
export const merchantForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }

    const user = await User.findOne({ email });

    // Always return generic message to avoid user enumeration
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link shortly.'
    };

    // If user not found or no password yet, just return generic response
    if (!user || !user.password) {
      return res.status(200).json(genericResponse);
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token + expiry (1 hour)
    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    try {
      const baseUrl = process.env.APP_URL || 'http://localhost:5173';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      await sendPasswordResetEmail(email, resetUrl, email.split('@')[0]);
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      // Do not leak email failure details to client
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
};

// Helper: Reset password using secure token
export const merchantResetPassword = async (req, res) => {
  try {
    const { token, email, password, confirmPassword } = req.body;

    if (!token || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, email, password and confirmPassword are required'
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Hash provided token and look up user
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email,
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.updatedAt = new Date();

    await user.save();

    // Issue new JWT so user can be logged in immediately
    const tokenJwt = generateJWT(user._id, user.userType, user.status);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
      token: tokenJwt,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
};

