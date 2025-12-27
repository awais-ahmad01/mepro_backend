import express from 'express';
import {
  createVIPBenefit,
  listVIPBenefits,
  getVIPBenefit,
  updateVIPBenefit,
  deleteVIPBenefit
} from '../controllers/vipBenefitController.js';
import { checkRegistrationStage } from '../middlewares/auth.js';

const router = express.Router();

// All VIP benefit routes require authenticated merchant
router.use(checkRegistrationStage);

router.get('/', listVIPBenefits);
router.post('/', createVIPBenefit);
router.get('/:benefitId', getVIPBenefit);
router.put('/:benefitId', updateVIPBenefit);
router.delete('/:benefitId', deleteVIPBenefit);

export default router;

