import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';

const ADVANCE_PAYOUT_RATE = 10n; 

const processAdvancePayouts = async (userId = null) => {
  const eligibleSales = await prisma.sale.findMany({
    where: {
      status: 'PENDING',
      isAdvancePaid: false,
      ...(userId ? { userId } : {}),
    },
    include: {
      user: {
        include: { wallet: true },
      },
    },
  });

  if (eligibleSales.length === 0) {
    return { usersProcessed: 0, salesProcessed: 0, totalAdvancePaise: 0n };
  }

  const salesByUser = eligibleSales.reduce((acc, sale) => {
    if (!acc[sale.userId]) acc[sale.userId] = [];
    acc[sale.userId].push(sale);
    return acc;
  }, {});

  const results = [];

  for (const [uid, userSales] of Object.entries(salesByUser)) {
    const wallet = userSales[0].user.wallet;
    if (!wallet) continue; 
    const userResult = await prisma.$transaction(async (tx) => {
      let totalAdvancePaise = 0n;

      for (const sale of userSales) {
        const advanceAmountPaise = (sale.earningPaise * ADVANCE_PAYOUT_RATE) / 100n;

        await tx.sale.update({
          where: { id: sale.id },
          data: { isAdvancePaid: true },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            saleId: sale.id,
            type: 'ADVANCE_CREDIT',
            amountPaise: advanceAmountPaise,
          },
        });

        totalAdvancePaise += advanceAmountPaise;
      }

      const availableRecovery = BigInt(wallet.pendingRecoveryPaise || 0);
      const recoveryAmount = totalAdvancePaise < availableRecovery ? totalAdvancePaise : availableRecovery;
      const actualCredit = totalAdvancePaise - recoveryAmount;

      if (recoveryAmount > 0n) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'RECOVERY_DEDUCTION',
            amountPaise: recoveryAmount,
          },
        });
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balancePaise: { increment: actualCredit },
          ...(recoveryAmount > 0n && { pendingRecoveryPaise: { decrement: recoveryAmount } })
        },
      });

      return {
        userId: uid,
        salesProcessed: userSales.length,
        totalAdvancePaise,
        newBalancePaise: updatedWallet.balancePaise,
      };
    });

    results.push(userResult);
  }

  return {
    usersProcessed: results.length,
    salesProcessed: results.reduce((s, r) => s + r.salesProcessed, 0),
    totalAdvancePaise: results.reduce((s, r) => s + r.totalAdvancePaise, 0n),
    breakdown: results,
  };
};

const getPayoutHistory = async (userId) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      walletTransactions: {
        include: {
          sale: { select: { id: true, brand: true, earningPaise: true, status: true } },
          withdrawal: { select: { id: true, status: true, failureReason: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!wallet) throw new AppError(404, 'Wallet not found for this user');
  return wallet;
};

export const payoutService = {
  processAdvancePayouts,
  getPayoutHistory,
};
