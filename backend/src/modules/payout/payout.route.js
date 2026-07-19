import express from 'express';
import { payoutController } from './payout.controller.js';
import { z } from 'zod';
import validate from '../../middlewares/validate.js';

const router = express.Router();

const advancePayoutSchema = {
  body: z
    .object({
      userId: z.string().uuid().optional(),
    })
    .optional(),
};

const historyParamSchema = {
  params: z.object({
    userId: z.string().uuid(),
  }),
};

router.post('/advance', validate(advancePayoutSchema), payoutController.processAdvancePayouts);

router.get('/:userId', validate(historyParamSchema), payoutController.getPayoutHistory);

export const payoutRoutes = router;
