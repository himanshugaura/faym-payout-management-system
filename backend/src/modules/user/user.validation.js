import { z } from 'zod';

const registerUser = {
  body: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
  }),
};

const getUser = {
  params: z.object({
    userId: z.string().uuid(),
  }),
};

export const userValidation = {
  registerUser,
  getUser,
};
