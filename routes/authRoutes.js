import express from 'express';
import {
  merchantLogin,
  merchantForgotPassword,
  merchantResetPassword
} from '../controllers/merchantAuthController.js';

const router = express.Router();

// Global authentication routes (all user types)
router.post('/login', merchantLogin);
router.post('/forgot-password', merchantForgotPassword);
router.post('/reset-password', merchantResetPassword);

export default router;


