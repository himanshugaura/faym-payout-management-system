import { z } from 'zod';

const initiateWithdrawal = {
  body: z.object({
    userId: z.string().uuid(),
    amountPaise: z.number().int().positive(),
  }),
};

const updateWithdrawalStatus = {
  params: z.object({
    withdrawalId: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['SUCCESS', 'FAILED']),
    failureReason: z.string().optional(),
  }),
};

const getWithdrawalsByUser = {
  params: z.object({
    userId: z.string().uuid(),
  }),
};

const resetCooldown = {
  body: z.object({
    userId: z.string().uuid(),
  }),
};

export const withdrawalValidation = {
  initiateWithdrawal,
  updateWithdrawalStatus,
  getWithdrawalsByUser,
  resetCooldown,
};
