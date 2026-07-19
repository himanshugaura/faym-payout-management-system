import { z } from 'zod';

const createSale = {
  body: z.object({
    userId: z.string().uuid(),
    brand: z.string().min(1).max(100),
    earningPaise: z.number().int().positive(),
  }),
};

const getSalesByUser = {
  params: z.object({
    userId: z.string().uuid(),
  }),
};

const reconcileSale = {
  params: z.object({
    saleId: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  }),
};

const getSaleById = {
  params: z.object({
    saleId: z.string().uuid(),
  }),
};

export const saleValidation = {
  createSale,
  getSalesByUser,
  reconcileSale,
  getSaleById,
};
