import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';

const registerUser = async (userData) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existingUser) {
    throw new AppError(409, 'Email already taken');
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: userData.email,
        name: userData.name,
      },
    });

    await tx.wallet.create({
      data: {
        userId: newUser.id,
      },
    });

    return tx.user.findUnique({
      where: { id: newUser.id },
      include: { wallet: true },
    });
  });

  return user;
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
};

const getAllUsers = async () => {
  return prisma.user.findMany({
    include: { wallet: true },
  });
};

export const userService = {
  registerUser,
  getUserById,
  getAllUsers,
};
