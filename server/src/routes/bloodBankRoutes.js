import { Router } from 'express';
import * as bloodBankController from '../controllers/bloodBankController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, bloodBankController.getBloodBanks);
router.get('/nearby', optionalAuth, bloodBankController.getNearbyBloodBanks);
router.get('/:id', optionalAuth, bloodBankController.getBloodBank);
router.post('/:bloodBankId/volunteers', protect, bloodBankController.registerVolunteer);

export default router;

