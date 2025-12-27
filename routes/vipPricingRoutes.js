import express from 'express';
import {
  getVIPPricing,
  updateVIPPricing
} from '../controllers/vipPricingController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';

const router = express.Router();

// All VIP pricing routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', getVIPPricing);
router.put('/', updateVIPPricing);
router.post('/', updateVIPPricing); // Support POST as well for flexibility

export default router;

