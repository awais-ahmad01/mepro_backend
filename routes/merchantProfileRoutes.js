// routes/businessDetailsRoutes.js
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
  checkOpeningHoursCompletion
} from '../controllers/merchantProfileController.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';
import { uploadBannerImage, uploadBusinessLogo, removeBannerImage, removeBusinessLogo, getBrandingImages } from '../controllers/merchantProfileController.js';

const router = express.Router();

// Middleware to check if user is at correct stage
// const checkRegistrationStage = async (req, res, next) => {
//   try {
//     // This would typically check JWT and user status
//     // For now, we assume req.user is set by auth middleware
//     console.log("cheking .....")
//     req.user.id = '69350362d0cef12a10e9db5d';
//     console.log("req:", req);
//     next();
//   } catch (error) {
//     res.status(401).json({
//       success: false,
//       error: 'Authentication required'
//     });
//   }
// };


// Middleware to check if user is at correct stage (TEMPORARY FOR TESTING)
const checkRegistrationStage = async (req, res, next) => {
  try {
    console.log("🔧 [TEST MODE] Setting user ID manually...");
    
    // TEMPORARY: Create req.user object for testing
    req.user = {
      id: '69350362d0cef12a10e9db5d', // Your test user ID
      email: 'test@example.com', // Optional, for logging
      userType: 'merchant'
    };
    
    console.log(`✅ [TEST MODE] User set: ${req.user.id}`);
    next();
    
  } catch (error) {
    console.error('❌ Middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
};

// Alternative: Simple middleware without try-catch
const simpleTestMiddleware = (req, res, next) => {
  console.log("🛠️ Using simple test middleware");
  
  // Set test user data directly
  req.user = {
    id: '69350362d0cef12a10e9db5d',
    email: 'test@example.com',
    userType: 'merchant'
  };
  
  console.log(`✅ Test user ID: ${req.user.id}`);
  next();
};



// Registration Progress
router.get('/progress', checkRegistrationStage, getRegistrationProgress);
router.put('/step/:step', checkRegistrationStage, saveStepData);
router.get('/step/:step', checkRegistrationStage, getStepData);
router.put('/navigate', checkRegistrationStage, updateRegistrationStep);

// Opening Hours (Step 4)
router.post('/opening-hours', checkRegistrationStage, saveOpeningHours);
router.get('/opening-hours', checkRegistrationStage, getAllOpeningHours);
router.get('/opening-hours/:day', checkRegistrationStage, getDayOpeningHours);
router.post('/validate-time-slot', checkRegistrationStage, validateTimeSlot);
router.get('/opening-hours-completion', checkRegistrationStage, checkOpeningHoursCompletion);

// Services (Step 5)
router.get('/suggested-services/:category', checkRegistrationStage, getSuggestedServices);

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

export default router;