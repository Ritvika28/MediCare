import { Router } from 'express';
import * as bloodBankController from '../controllers/bloodBankController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', bloodBankController.getBloodBanks);
router.get('/nearby', bloodBankController.getNearbyBloodBanks);
router.get('/:id', bloodBankController.getBloodBank);
router.post('/:bloodBankId/volunteers', bloodBankController.registerVolunteer);

export default router;
