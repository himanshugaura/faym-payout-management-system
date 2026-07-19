import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { simulatePayoutGateway } from '../../utils/paymentGateway.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const initiateWithdrawal = async (userId, amountPaise, forceStatus) => {
  const amountBigInt = BigInt(amountPaise);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError(404, 'Wallet not found');

  if (wallet.lastWithdrawalAt) {
    const msSinceLastWithdrawal = Date.now() - wallet.lastWithdrawalAt.getTime();
    if (msSinceLastWithdrawal < TWENTY_FOUR_HOURS_MS) {
      const nextAllowedIn = Math.ceil(
        (TWENTY_FOUR_HOURS_MS - msSinceLastWithdrawal) / (60 * 1000),
      );
      throw new AppError(
        429,
        `Only one withdrawal every 24 hours. Try again in ${nextAllowedIn} minute(s).`,
      );
    }
  }

  if (wallet.balancePaise < amountBigInt) {
    throw new AppError(
      400,
      `Insufficient balance. Available: ${wallet.balancePaise} paise, requested: ${amountBigInt} paise`,
    );
  }

  const withdrawal = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.create({
      data: { userId, amountPaise: amountBigInt, status: 'PROCESSING' },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        withdrawalId: w.id,
        type: 'WITHDRAWAL_DEBIT',
        amountPaise: amountBigInt,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balancePaise: { decrement: amountBigInt },
        lastWithdrawalAt: new Date(),
      },
    });

    return w;
  });

  const gatewayResult = await simulatePayoutGateway({
    withdrawalId: withdrawal.id,
    amountPaise: amountBigInt,
    userId,
    forceStatus,
  });

  if (gatewayResult.success) {
    const completed = await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: 'SUCCESS', completedAt: new Date() },
    });

    return {
      withdrawal: completed,
      gateway: {
        status: 'SUCCESS',
        ref: gatewayResult.gatewayRef,
      },
    };
  }

  const refunded = await prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'FAILED',
        failureReason: gatewayResult.failureReason,
        completedAt: new Date(),
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        withdrawalId: withdrawal.id,
        type: 'WITHDRAWAL_REFUND',
        amountPaise: amountBigInt,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { 
        balancePaise: { increment: amountBigInt },
        lastWithdrawalAt: null // Allow immediate retry per assignment req
      },
    });

    return updated;
  });

  return {
    withdrawal: refunded,
    gateway: {
      status: 'FAILED',
      ref: gatewayResult.gatewayRef,
      failureReason: gatewayResult.failureReason,
    },
  };
};

const updateWithdrawalStatus = async (withdrawalId, status, failureReason = null) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { include: { wallet: true } } },
  });

  if (!withdrawal) throw new AppError(404, 'Withdrawal not found');

  if (!['PENDING', 'PROCESSING'].includes(withdrawal.status)) {
    throw new AppError(400, `Withdrawal is already finalized (status: ${withdrawal.status})`);
  }

  if (status === 'SUCCESS') {
    return {
      withdrawal: await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'SUCCESS', completedAt: new Date() },
      }),
      gateway: { status: 'SUCCESS' },
    };
  }

  const wallet = withdrawal.user.wallet;
  if (!wallet) throw new AppError(500, 'User wallet not found');

  const refunded = await prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status, failureReason, completedAt: new Date() },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        withdrawalId,
        type: 'WITHDRAWAL_REFUND',
        amountPaise: withdrawal.amountPaise,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { 
        balancePaise: { increment: withdrawal.amountPaise },
        lastWithdrawalAt: null 
      },
    });

    return updated;
  });

  return {
    withdrawal: refunded,
    gateway: { status, failureReason },
  };
};

const getWithdrawalsByUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  return prisma.withdrawal.findMany({
    where: { userId },
    include: {
      walletTransactions: {
        select: { type: true, amountPaise: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getWithdrawalById = async (withdrawalId) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      walletTransactions: true,
    },
  });
  if (!withdrawal) throw new AppError(404, 'Withdrawal not found');
  return withdrawal;
};

const resetCooldown = async (userId) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError(404, 'Wallet not found');

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { lastWithdrawalAt: null },
  });
  return { success: true };
};

export const withdrawalService = {
  initiateWithdrawal,
  updateWithdrawalStatus,
  getWithdrawalsByUser,
  getWithdrawalById,
  resetCooldown,
};
