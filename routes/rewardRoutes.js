import express from 'express';
import {
  createReward,
  listRewards,
  getReward,
  updateReward,
  deleteReward
} from '../controllers/rewardController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';
import { uploadSingle, handleUploadErrors } from '../middlewares/upload.js';

const router = express.Router();

// All reward routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', listRewards);
router.post('/', uploadSingle('image'), handleUploadErrors, createReward);
router.get('/:rewardId', getReward);
router.put('/:rewardId', uploadSingle('image'), handleUploadErrors, updateReward);
router.delete('/:rewardId', deleteReward);

export default router;


