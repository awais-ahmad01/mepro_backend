import express from 'express';
import {
  createDiamondPromotion,
  listDiamondPromotions,
  getDiamondPromotion,
  updateDiamondPromotion,
  deleteDiamondPromotion
} from '../controllers/diamondPromotionController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// All diamond promotion routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', listDiamondPromotions);
router.post('/', uploadSingle('image'), handleUploadErrors, createDiamondPromotion);
router.get('/:promotionId', getDiamondPromotion);
router.put('/:promotionId', uploadSingle('image'), handleUploadErrors, updateDiamondPromotion);
router.delete('/:promotionId', deleteDiamondPromotion);

export default router;

