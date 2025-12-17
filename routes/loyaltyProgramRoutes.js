import express from 'express';
import {
  createLoyaltyProgram,
  listLoyaltyPrograms,
  getLoyaltyProgram,
  updateLoyaltyProgram,
  deleteLoyaltyProgram
} from '../controllers/loyaltyProgramController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// All loyalty program routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', listLoyaltyPrograms);
router.post('/', uploadSingle('image'), handleUploadErrors, createLoyaltyProgram);
router.get('/:programId', getLoyaltyProgram);
router.put('/:programId', uploadSingle('image'), handleUploadErrors, updateLoyaltyProgram);
router.delete('/:programId', deleteLoyaltyProgram);

export default router;

