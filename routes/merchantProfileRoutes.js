import express from 'express';
import {
  getRegistrationProgress,
  saveStepData,
  getStepData,
  updateRegistrationStep,
  submitForReview,
  getCompleteProfile,
  saveOpeningHours,
  getDayOpeningHours,
  getAllOpeningHours,
  getSuggestedServices,
  validateTimeSlot,
  checkOpeningHoursCompletion,
  getMerchantStatus
} from '../controllers/merchantProfileController.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';
import { uploadBannerImage, uploadBusinessLogo, removeBannerImage, removeBusinessLogo, getBrandingImages } from '../controllers/merchantProfileController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';

const router = express.Router();

// Middleware to check if user is at correct stage (TEMPORARY FOR TESTING)
// const checkRegistrationStage = async (req, res, next) => {
//   try {
//     console.log("🔧 [TEST MODE] Setting user ID manually...");
    
//     // TEMPORARY: Create req.user object for testing
//     req.user = {
//       id: '69350362d0cef12a10e9db5d', // Your test user ID
//       email: 'test@example.com', // Optional, for logging
//       userType: 'merchant'
//     };
    
//     console.log(`✅ [TEST MODE] User set: ${req.user.id}`);
//     next();
    
//   } catch (error) {
//     console.error('❌ Middleware error:', error);
//     res.status(401).json({
//       success: false,
//       error: 'Authentication required'
//     });
//   }
// };



// Registration Progress
router.get('/progress', checkRegistrationStage, getRegistrationProgress);
router.put('/step/:step', checkRegistrationStage, saveStepData);
router.get('/step/:step', checkRegistrationStage, getStepData);
router.put('/navigate', checkRegistrationStage, updateRegistrationStep);

// Opening Hours (Step 4)
router.post('/opening-hours', checkRegistrationStage, saveOpeningHours);
router.get('/opening-hours', checkRegistrationStage, getAllOpeningHours);
// router.get('/opening-hours/:day', checkRegistrationStage, getDayOpeningHours);
// router.post('/validate-time-slot', checkRegistrationStage, validateTimeSlot);
// router.get('/opening-hours-completion', checkRegistrationStage, checkOpeningHoursCompletion);

// Services (Step 5)
// router.get('/suggested-services/:category', checkRegistrationStage, getSuggestedServices);

// Submission
router.post('/submit', checkRegistrationStage, submitForReview);
router.get('/review', checkRegistrationStage, getCompleteProfile);

// Business Branding - Image Upload
router.post('/upload/banner', 
  checkRegistrationStage, 
  uploadSingle('bannerImage'),
  handleUploadErrors,
  uploadBannerImage
);

router.post('/upload/logo', 
  checkRegistrationStage, 
  uploadSingle('businessLogo'),
  handleUploadErrors,
  uploadBusinessLogo
);
router.delete('/remove/banner', checkRegistrationStage, removeBannerImage);
router.delete('/remove/logo', checkRegistrationStage, removeBusinessLogo);
router.get('/branding', checkRegistrationStage, getBrandingImages);

router.get('/status', checkRegistrationStage, getMerchantStatus);

export default router;