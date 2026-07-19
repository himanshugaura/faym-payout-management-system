import express from 'express';
import { withdrawalController } from './withdrawal.controller.js';
import validate from '../../middlewares/validate.js';
import { withdrawalValidation } from './withdrawal.validation.js';
import { z } from 'zod';

const router = express.Router();

const getByIdSchema = {
  params: z.object({ withdrawalId: z.string().uuid() }),
};

router.post('/reset-cooldown', validate(withdrawalValidation.resetCooldown), withdrawalController.resetCooldown);
router.post('/', validate(withdrawalValidation.initiateWithdrawal), withdrawalController.initiateWithdrawal);

router.get('/user/:userId', validate(withdrawalValidation.getWithdrawalsByUser), withdrawalController.getWithdrawalsByUser);

router.get('/:withdrawalId', validate(getByIdSchema), withdrawalController.getWithdrawalById);

router.patch('/:withdrawalId/status', validate(withdrawalValidation.updateWithdrawalStatus), withdrawalController.updateWithdrawalStatus);

export const withdrawalRoutes = router;
