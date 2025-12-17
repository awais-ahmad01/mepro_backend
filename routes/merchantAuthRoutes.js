
import express from 'express';
import {
  merchantInitiateRegistration,
  merchantVerifyOTP,
  merchantSetPassword,
  merchantResendOTP,
  checkMerchantStatus,
  // verifyTempToken,
  merchantLogin,
  merchantForgotPassword,
  merchantResetPassword
} from '../controllers/merchantAuthController.js';

const router = express.Router();

// Merchant Registration Flow
router.post('/initiate', merchantInitiateRegistration);      // Step 1: Enter email
router.post('/verify-otp', merchantVerifyOTP);              // Step 2: Verify OTP
router.post('/set-password', merchantSetPassword);          // Step 3: Set password
// router.post('/resend-otp', merchantResendOTP);              // Resend OTP if needed
router.get('/status/:userId', checkMerchantStatus);         // Check registration status
// router.post('/verify-temp-token', verifyTempToken);         // Verify temp token

export default router;