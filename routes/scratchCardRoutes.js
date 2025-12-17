import express from 'express';
import {
  createScratchCard,
  listScratchCards,
  getScratchCard,
  updateScratchCard,
  deleteScratchCard
} from '../controllers/scratchCardController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// All scratch card routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', listScratchCards);
router.post('/', uploadSingle('image'), handleUploadErrors, createScratchCard);
router.get('/:cardId', getScratchCard);
router.put('/:cardId', uploadSingle('image'), handleUploadErrors, updateScratchCard);
router.delete('/:cardId', deleteScratchCard);

export default router;

