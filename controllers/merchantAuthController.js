// // controllers/authController.js - MERCHANT SPECIFIC
// import User from '../models/user.js';
// // Generate 6-digit OTP
// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Step 1: Merchant initiates registration with email only
// export const merchantInitiateRegistration = async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log("Merchant Registration Initiated for:", email);

//     // Validation
//     if (!email || !email.includes('@')) {
//       return res.status(400).json({
//         success: false,
//         error: 'Valid email is required'
//       });
//     }

//     // Check if email already exists
//     const existingUser = await User.findOne({ email });
    
//     if (existingUser) {
//       // If merchant already registered but not verified
//       if (existingUser.userType === 'merchant' && existingUser.status === 'pending_verification') {
//         // Resend OTP
//         const otp = generateOTP();
//         existingUser.verificationCode = otp;
//         existingUser.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
//         await existingUser.save();
        
//         // Send OTP email (simulated)
//         console.log(`OTP for ${email}: ${otp}`);
        
//         return res.status(200).json({
//           success: true,
//           message: 'OTP resent to email',
//           userId: existingUser._id
//         });
//       }
      
//       return res.status(400).json({
//         success: false,
//         error: 'Email already registered',
//         userType: existingUser.userType,
//         status: existingUser.status
//       });
//     }

//     // Create new merchant user without password
//     const otp = generateOTP();
//     const newUser = new User({
//       email,
//       userType: 'merchant',
//       status: 'pending_verification',
//       verificationCode: otp,
//       verificationExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
//     });

//     await newUser.save();

//     // Send OTP email (simulated - use Nodemailer/SendGrid in production)
//     console.log(`OTP for ${email}: ${otp}`);
    
//     // In production, use:
//     // await sendEmail({
//     //   to: email,
//     //   subject: 'Verify Your Merchant Account',
//     //   text: `Your verification code is: ${otp}`
//     // });

//     res.status(201).json({
//       success: true,
//       message: 'OTP sent to email',
//       userId: newUser._id
//     });

//   } catch (error) {
//     console.error('Merchant registration error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Registration failed. Please try again.'
//     });
//   }
// };

// // Step 2: Verify OTP
// export const merchantVerifyOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;

//     // Validation
//     if (!userId || !otp) {
//       return res.status(400).json({
//         success: false,
//         error: 'User ID and OTP are required'
//       });
//     }

//     // Find user
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found'
//       });
//     }

//     // Check if user is a merchant
//     if (user.userType !== 'merchant') {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid user type'
//       });
//     }

//     // Check if already verified
//     if (user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email already verified'
//       });
//     }

//     // Check OTP
//     if (!user.verificationCode || !user.verificationExpiry) {
//       return res.status(400).json({
//         success: false,
//         error: 'No pending verification'
//       });
//     }

//     // Check OTP expiry
//     if (user.verificationExpiry < new Date()) {
//       return res.status(400).json({
//         success: false,
//         error: 'OTP expired. Please request a new one.'
//       });
//     }

//     // Verify OTP
//     if (user.verificationCode !== otp) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid OTP'
//       });
//     }

//     // Update user
//     user.isEmailVerified = true;
//     user.status = 'pending_password';
//     user.verificationCode = undefined;
//     user.verificationExpiry = undefined;
//     user.updatedAt = new Date();
    
//     await user.save();

//     // Generate temporary token for password setup
//     const tempToken = generateTempToken(user._id, user.userType);

//     res.status(200).json({
//       success: true,
//       message: 'Email verified successfully',
//       token: tempToken,
//       userId: user._id,
//       nextStep: 'set_password'
//     });

//   } catch (error) {
//     console.error('OTP verification error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Verification failed. Please try again.'
//     });
//   }
// };

// // Step 3: Set Password after OTP verification
// export const merchantSetPassword = async (req, res) => {
//   try {
//     const { userId, password, confirmPassword } = req.body;

//     // Validation
//     if (!userId || !password || !confirmPassword) {
//       return res.status(400).json({
//         success: false,
//         error: 'All fields are required'
//       });
//     }

//     if (password !== confirmPassword) {
//       return res.status(400).json({
//         success: false,
//         error: 'Passwords do not match'
//       });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         error: 'Password must be at least 6 characters'
//       });
//     }

//     // Find user
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found'
//       });
//     }

//     // Check if user is a merchant
//     if (user.userType !== 'merchant') {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid user type'
//       });
//     }

//     // Check if email is verified
//     if (!user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email not verified. Please verify your email first.'
//       });
//     }

//     // Check if already has password
//     if (user.password) {
//       return res.status(400).json({
//         success: false,
//         error: 'Password already set'
//       });
//     }

//     // Set password and update status
//     user.password = password;
//     user.status = 'pending_approval'; // Ready for business details
//     user.updatedAt = new Date();
    
//     await user.save();

//     // Generate JWT token for session
//     const token = generateJWT(user._id, user.userType);

//     res.status(200).json({
//       success: true,
//       message: 'Password set successfully',
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         userType: user.userType,
//         status: user.status
//       },
//       nextStep: 'business_details'
//     });

//   } catch (error) {
//     console.error('Set password error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to set password. Please try again.'
//     });
//   }
// };

// // Helper: Resend OTP
// export const merchantResendOTP = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Find user
//     const user = await User.findOne({ email, userType: 'merchant' });
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'Merchant not found'
//       });
//     }

//     // Check if already verified
//     if (user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email already verified'
//       });
//     }

//     // Generate new OTP
//     const otp = generateOTP();
//     user.verificationCode = otp;
//     user.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
//     user.updatedAt = new Date();
    
//     await user.save();

//     // Send OTP email (simulated)
//     console.log(`New OTP for ${email}: ${otp}`);

//     res.status(200).json({
//       success: true,
//       message: 'OTP resent successfully',
//       userId: user._id
//     });

//   } catch (error) {
//     console.error('Resend OTP error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to resend OTP'
//     });
//   }
// };

// // Helper: Check Registration Status
// export const checkMerchantStatus = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findById(userId);
    
//     if (!user || user.userType !== 'merchant') {
//       return res.status(404).json({
//         success: false,
//         error: 'Merchant not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       user: {
//         id: user._id,
//         email: user.email,
//         userType: user.userType,
//         isEmailVerified: user.isEmailVerified,
//         status: user.status,
//         createdAt: user.createdAt
//       }
//     });

//   } catch (error) {
//     console.error('Check status error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to check status'
//     });
//   }
// };

// // Token generation helpers (simplified)
// const generateTempToken = (userId, userType) => {
//   // In production, use JWT
//   return `temp_${userId}_${Date.now()}`;
// };

// const generateJWT = (userId, userType) => {
//   // In production, use jsonwebtoken library
//   // return jwt.sign({ id: userId, type: userType }, process.env.JWT_SECRET, { expiresIn: '7d' });
//   return `jwt_${userId}_${Date.now()}`;
// };




// controllers/merchantAuthController.js - COMPLETE UPDATED VERSION
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTPEmail } from '../services/sendEmail.js';

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT token
const generateJWT = (userId, userType) => {
  return jwt.sign(
    { id: userId, type: userType },
    process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    { expiresIn: '7d' }
  );
};

// Generate temporary token for password setup
const generateTempToken = (userId, userType) => {
  return jwt.sign(
    { id: userId, type: userType, temp: true },
    process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    { expiresIn: '15m' } // Short-lived for password setup
  );
};

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
            userId: existingUser._id
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
        email: newUser.email
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
    const tempToken = generateTempToken(user._id, user.userType);

    console.log(`🔑 Generated temporary token for password setup`, tempToken);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token: tempToken,
      userId: user._id,
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
    const token = generateJWT(user._id, user.userType);

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
    const user = await User.findOne({ email, userType: 'merchant' });
    
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
export const verifyTempToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');
    
    if (!decoded.temp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is at correct step
    if (user.status !== 'pending_password') {
      return res.status(400).json({
        success: false,
        error: 'Cannot set password at this stage'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      userId: user._id,
      email: user.email
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please restart the password setup process.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
};

// Helper: Login for merchants (after approval)
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

    // Find user
    const user = await User.findOne({ email, userType: 'merchant' });
    
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

    // Check if merchant is approved
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account not approved yet. Please wait for admin approval.',
        status: user.status
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateJWT(user._id, user.userType);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        status: user.status
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

// Helper: Forgot password for merchants
export const merchantForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email, userType: 'merchant' });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Check if user has password (completed registration)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'Please complete your registration first'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id, type: 'password_reset' },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
      { expiresIn: '1h' }
    );

    // In production, send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    // Store reset token in user record if needed
    // user.resetToken = resetToken;
    // user.resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    // await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to email',
      resetToken // In production, don't send token in response
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
};







// // controllers/merchantAuthController.js - UPDATED WITH EMAIL
// import User from '../models/user.js';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { 
//   sendOTPEmail, 
//   sendWelcomeEmail, 
//   sendAdminApprovalEmail 
// } from '../utils/emailService.js';

// // Generate 6-digit OTP
// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Generate JWT token
// const generateJWT = (userId, userType) => {
//   return jwt.sign(
//     { id: userId, type: userType },
//     process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
//     { expiresIn: '7d' }
//   );
// };

// // Generate temporary token for password setup
// const generateTempToken = (userId, userType) => {
//   return jwt.sign(
//     { id: userId, type: userType, temp: true },
//     process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
//     { expiresIn: '15m' } // Short-lived for password setup
//   );
// };

// // Step 1: Merchant initiates registration with email only - UPDATED
// export const merchantInitiateRegistration = async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log("📧 Merchant Registration Initiated for:", email);

//     // Validation
//     if (!email || !email.includes('@')) {
//       return res.status(400).json({
//         success: false,
//         error: 'Valid email is required'
//       });
//     }

//     // Check if email already exists
//     const existingUser = await User.findOne({ email });
    
//     if (existingUser) {
//       // If merchant already registered but not verified
//       if (existingUser.userType === 'merchant' && existingUser.status === 'pending_verification') {
//         // Resend OTP
//         const otp = generateOTP();
//         existingUser.verificationCode = otp;
//         existingUser.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
//         await existingUser.save();
        
//         try {
//           // Send OTP email
//           await sendOTPEmail(email, otp, email.split('@')[0]);
          
//           return res.status(200).json({
//             success: true,
//             message: 'OTP resent to email',
//             userId: existingUser._id
//           });
//         } catch (emailError) {
//           console.error('Failed to send OTP email:', emailError);
//           return res.status(500).json({
//             success: false,
//             error: 'Failed to send OTP. Please try again.'
//           });
//         }
//       }
      
//       return res.status(400).json({
//         success: false,
//         error: 'Email already registered',
//         userType: existingUser.userType,
//         status: existingUser.status
//       });
//     }

//     // Create new merchant user without password
//     const otp = generateOTP();
//     const newUser = new User({
//       email,
//       userType: 'merchant',
//       status: 'pending_verification',
//       verificationCode: otp,
//       verificationExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
//     });

//     await newUser.save();

//     try {
//       // Send OTP email with HTML template
//       await sendOTPEmail(email, otp, email.split('@')[0]);
      
//       console.log(`✅ OTP sent to ${email}`);
      
//       res.status(201).json({
//         success: true,
//         message: 'OTP sent to email',
//         userId: newUser._id,
//         email: newUser.email
//       });
      
//     } catch (emailError) {
//       console.error('Failed to send OTP email:', emailError);
      
//       // Rollback user creation if email fails
//       await User.findByIdAndDelete(newUser._id);
      
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to send verification email. Please try again.'
//       });
//     }

//   } catch (error) {
//     console.error('❌ Merchant registration error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Registration failed. Please try again.'
//     });
//   }
// };

// // Step 2: Verify OTP
// export const merchantVerifyOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;

//     // Validation
//     if (!userId || !otp) {
//       return res.status(400).json({
//         success: false,
//         error: 'User ID and OTP are required'
//       });
//     }

//     // Find user
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found'
//       });
//     }

//     // Check if user is a merchant
//     if (user.userType !== 'merchant') {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid user type'
//       });
//     }

//     // Check if already verified
//     if (user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email already verified'
//       });
//     }

//     // Check OTP
//     if (!user.verificationCode || !user.verificationExpiry) {
//       return res.status(400).json({
//         success: false,
//         error: 'No pending verification'
//       });
//     }

//     // Check OTP expiry
//     if (user.verificationExpiry < new Date()) {
//       return res.status(400).json({
//         success: false,
//         error: 'OTP expired. Please request a new one.'
//       });
//     }

//     // Verify OTP
//     if (user.verificationCode !== otp) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid OTP'
//       });
//     }

//     // Update user
//     user.isEmailVerified = true;
//     user.status = 'pending_password';
//     user.verificationCode = undefined;
//     user.verificationExpiry = undefined;
//     user.updatedAt = new Date();
    
//     await user.save();

//     // Generate temporary token for password setup
//     const tempToken = generateTempToken(user._id, user.userType);

//     res.status(200).json({
//       success: true,
//       message: 'Email verified successfully',
//       token: tempToken,
//       userId: user._id,
//       email: user.email,
//       nextStep: 'set_password'
//     });

//   } catch (error) {
//     console.error('❌ OTP verification error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Verification failed. Please try again.'
//     });
//   }
// };

// // Step 3: Set Password after OTP verification - UPDATED
// export const merchantSetPassword = async (req, res) => {
//   try {
//     const { userId, password, confirmPassword } = req.body;

//     // Validation
//     if (!userId || !password || !confirmPassword) {
//       return res.status(400).json({
//         success: false,
//         error: 'All fields are required'
//       });
//     }

//     if (password !== confirmPassword) {
//       return res.status(400).json({
//         success: false,
//         error: 'Passwords do not match'
//       });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         error: 'Password must be at least 6 characters'
//       });
//     }

//     // Find user
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found'
//       });
//     }

//     // Check if user is a merchant
//     if (user.userType !== 'merchant') {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid user type'
//       });
//     }

//     // Check if email is verified
//     if (!user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email not verified. Please verify your email first.'
//       });
//     }

//     // Check if already has password
//     if (user.password) {
//       return res.status(400).json({
//         success: false,
//         error: 'Password already set'
//       });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Update user
//     user.password = hashedPassword;
//     user.status = 'pending_approval'; // Ready for business details
//     user.updatedAt = new Date();
    
//     await user.save();

//     // Send welcome email
//     try {
//       await sendWelcomeEmail(user.email, user.email.split('@')[0]);
//       console.log(`✅ Welcome email sent to ${user.email}`);
//     } catch (emailError) {
//       console.error('Failed to send welcome email:', emailError);
//       // Continue even if email fails - don't break the flow
//     }

//     // Generate JWT token
//     const token = generateJWT(user._id, user.userType);

//     res.status(200).json({
//       success: true,
//       message: 'Password set successfully. Welcome to Mepro!',
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         userType: user.userType,
//         status: user.status
//       },
//       nextStep: 'business_details'
//     });

//   } catch (error) {
//     console.error('❌ Set password error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to set password. Please try again.'
//     });
//   }
// };

// // Helper: Resend OTP - UPDATED
// export const merchantResendOTP = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Find user
//     const user = await User.findOne({ email, userType: 'merchant' });
    
//     if (!user) {
//       // Don't reveal if user exists for security
//       return res.status(200).json({
//         success: true,
//         message: 'If an account exists with this email, you will receive a new OTP'
//       });
//     }

//     // Check if already verified
//     if (user.isEmailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: 'Email already verified'
//       });
//     }

//     // Check rate limiting (prevent abuse)
//     const lastResend = user.updatedAt;
//     const now = new Date();
//     const timeDiff = now - lastResend;
    
//     if (timeDiff < 30000) { // 30 seconds cooldown
//       return res.status(429).json({
//         success: false,
//         error: 'Please wait 30 seconds before requesting another OTP'
//       });
//     }

//     // Generate new OTP
//     const otp = generateOTP();
//     user.verificationCode = otp;
//     user.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
//     user.updatedAt = new Date();
    
//     await user.save();

//     try {
//       // Send OTP email
//       await sendOTPEmail(email, otp, email.split('@')[0]);
      
//       res.status(200).json({
//         success: true,
//         message: 'New OTP sent successfully',
//         userId: user._id,
//         cooldown: 30 // seconds
//       });
      
//     } catch (emailError) {
//       console.error('Failed to send OTP email:', emailError);
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to send OTP. Please try again.'
//       });
//     }

//   } catch (error) {
//     console.error('❌ Resend OTP error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to resend OTP'
//     });
//   }
// };

// // Helper: Admin approval notification (for future use)
// export const notifyAdminForApproval = async (merchantId) => {
//   try {
//     const user = await User.findById(merchantId);
//     if (!user) return;

//     // In production, you would:
//     // 1. Send notification to admin panel
//     // 2. Send email to admin team
//     // 3. Create admin notification record
    
//     console.log(`📋 Merchant ${user.email} submitted for admin approval`);
    
//   } catch (error) {
//     console.error('Failed to notify admin:', error);
//   }
// };