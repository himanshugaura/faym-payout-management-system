import catchAsync from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/response.js';
import { withdrawalService } from './withdrawal.service.js';

const initiateWithdrawal = catchAsync(async (req, res) => {
  const { userId, amountPaise, forceStatus } = req.body;
  const result = await withdrawalService.initiateWithdrawal(userId, amountPaise, forceStatus);
  const statusCode = result.withdrawal.status === 'SUCCESS' ? 201 : 200;
  return sendResponse(res, statusCode, 'Withdrawal processed', result);
});

const updateWithdrawalStatus = catchAsync(async (req, res) => {
  const { withdrawalId } = req.params;
  const { status, failureReason } = req.body;
  const result = await withdrawalService.updateWithdrawalStatus(
    withdrawalId,
    status,
    failureReason,
  );
  return sendResponse(res, 200, 'Withdrawal status updated successfully', result);
});

const getWithdrawalsByUser = catchAsync(async (req, res) => {
  const withdrawals = await withdrawalService.getWithdrawalsByUser(req.params.userId);
  return sendResponse(res, 200, 'Withdrawals fetched successfully', withdrawals);
});

const getWithdrawalById = catchAsync(async (req, res) => {
  const withdrawal = await withdrawalService.getWithdrawalById(req.params.withdrawalId);
  return sendResponse(res, 200, 'Withdrawal fetched successfully', withdrawal);
});

const resetCooldown = catchAsync(async (req, res) => {
  const { userId } = req.body;
  await withdrawalService.resetCooldown(userId);
  sendResponse(res, 200, 'Withdrawal cooldown reset successfully');
});

export const withdrawalController = {
  initiateWithdrawal,
  updateWithdrawalStatus,
  getWithdrawalsByUser,
  getWithdrawalById,
  resetCooldown,
};
