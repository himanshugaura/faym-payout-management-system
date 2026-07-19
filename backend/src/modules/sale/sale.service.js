import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';

const createSale = async ({ userId, brand, earningPaise }) => {

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  return prisma.sale.create({
    data: {
      userId,
      brand,
      earningPaise: BigInt(earningPaise),
    },
  });
};

const getAllSales = async ({ userId, status, brand } = {}) => {
  return prisma.sale.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      ...(brand ? { brand } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      walletTransactions: {
        where: { type: 'ADVANCE_CREDIT' },
        select: { amountPaise: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getSaleById = async (saleId) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      walletTransactions: true,
    },
  });
  if (!sale) throw new AppError(404, 'Sale not found');
  return sale;
};

const getSalesByUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  return prisma.sale.findMany({
    where: { userId },
    include: {
      walletTransactions: {
        select: { type: true, amountPaise: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const reconcileSale = async (saleId, newStatus) => {

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      user: {
        include: { wallet: true },
      },
      walletTransactions: {
        where: { type: 'ADVANCE_CREDIT' },
      },
    },
  });

  if (!sale) throw new AppError(404, 'Sale not found');
  if (sale.status !== 'PENDING') {
    throw new AppError(400, `Sale has already been reconciled (status: ${sale.status})`);
  }

  const wallet = sale.user.wallet;
  if (!wallet) throw new AppError(500, 'User wallet not found');

  const advancePaidPaise = sale.walletTransactions.reduce(
    (sum, tx) => sum + tx.amountPaise,
    0n,
  );

  return prisma.$transaction(async (tx) => {

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: { status: newStatus, reconciledAt: new Date() },
    });

    if (newStatus === 'APPROVED') {

      const finalCreditPaise = sale.earningPaise - advancePaidPaise;

      if (finalCreditPaise !== 0n) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            saleId,
            type: 'FINAL_CREDIT',
            amountPaise: finalCreditPaise,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balancePaise: { increment: finalCreditPaise } },
        });
      }
    } else {

      if (advancePaidPaise > 0n) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            saleId,
            type: 'REJECTION_ADJUSTMENT',
            amountPaise: advancePaidPaise,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balancePaise: { decrement: advancePaidPaise } },
        });
      }
    }

    return updatedSale;
  });
};

export const saleService = {
  createSale,
  getAllSales,
  getSaleById,
  getSalesByUser,
  reconcileSale,
};
