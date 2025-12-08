import jwt from 'jsonwebtoken';
import User from '../models/user.js';
// Production Middleware: Check Authentication and Registration Stage
export const checkRegistrationStage = async (req, res, next) => {
  try {
    // 1. Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
        errorCode: 'TOKEN_MISSING'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // 2. Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // ... existing token verification
    }
    
    // 3. Check if user exists
    const user = await User.findById(decoded.userId).select('id email userType status');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // 4. Check account status
    const forbiddenStatuses = ['suspended', 'deleted'];
    if (forbiddenStatuses.includes(user.status)) {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended',
        errorCode: 'ACCOUNT_SUSPENDED'
      });
    }

    // 5. IMPORTANT: Check if user can access merchant routes
    // Merchants can access these routes if status is 'pending_approval' OR 'active'
    const allowedMerchantStatuses = ['pending_approval', 'active'];
    
    if (user.userType === 'merchant' && !allowedMerchantStatuses.includes(user.status)) {
      return res.status(403).json({
        success: false,
        error: 'Please complete email verification first',
        errorCode: 'VERIFICATION_REQUIRED',
        requiredAction: 'verify_email'
      });
    }
    
    // 6. Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      status: user.status,
      // Add flags for frontend to determine what to show
      canCompleteRegistration: user.status === 'pending_approval',
      canAccessDashboard: user.status === 'active'
    };
    
    console.log(`✅ Authenticated user: ${user.email} (${user.userType}, ${user.status})`);
    
    next();
    
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      errorCode: 'AUTH_FAILED'
    });
  }
};