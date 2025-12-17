import express from 'express';
import {
  createPromotion,
  listPromotions,
  getPromotion,
  updatePromotion,
  deletePromotion
} from '../controllers/promotionController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// All promotion routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', listPromotions);
router.post('/', uploadSingle('image'), handleUploadErrors, createPromotion);
router.get('/:promotionId', getPromotion);
router.put('/:promotionId', uploadSingle('image'), handleUploadErrors, updatePromotion);
router.delete('/:promotionId', deletePromotion);

export default router;


