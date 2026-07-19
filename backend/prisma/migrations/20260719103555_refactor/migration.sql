-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'RECOVERY_DEDUCTION';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "pendingRecoveryPaise" BIGINT NOT NULL DEFAULT 0;
