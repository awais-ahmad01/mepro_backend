// // routes/merchantAuthRoutes.js
// import express from 'express';
// import {
//   merchantInitiateRegistration,
//   merchantVerifyOTP,
//   merchantSetPassword,
//   merchantResendOTP,
//   checkMerchantStatus
// } from '../controllers/merchantAuthController.js';

// const router = express.Router();

// // Merchant Registration Flow
// router.post('/initiate', merchantInitiateRegistration);      // Step 1: Enter email
// router.post('/verify-otp', merchantVerifyOTP);              // Step 2: Verify OTP
// router.post('/set-password', merchantSetPassword);          // Step 3: Set password
// router.post('/resend-otp', merchantResendOTP);              // Resend OTP if needed
// router.get('/status/:userId', checkMerchantStatus);         // Check registration status

// export default router;



// routes/merchantAuthRoutes.js - COMPLETE VERSION
import express from 'express';
import {
  merchantInitiateRegistration,
  merchantVerifyOTP,
  merchantSetPassword,
  merchantResendOTP,
  checkMerchantStatus,
  verifyTempToken,
  merchantLogin,
  merchantForgotPassword
} from '../controllers/merchantAuthController.js';

const router = express.Router();

// Merchant Registration Flow
router.post('/initiate', merchantInitiateRegistration);      // Step 1: Enter email
router.post('/verify-otp', merchantVerifyOTP);              // Step 2: Verify OTP
router.post('/set-password', merchantSetPassword);          // Step 3: Set password
router.post('/resend-otp', merchantResendOTP);              // Resend OTP if needed
router.get('/status/:userId', checkMerchantStatus);         // Check registration status
router.post('/verify-temp-token', verifyTempToken);         // Verify temp token

// Merchant Login & Password Management
router.post('/login', merchantLogin);                       // Login after approval
router.post('/forgot-password', merchantForgotPassword);    // Forgot password

export default router;