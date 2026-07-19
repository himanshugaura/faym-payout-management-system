import catchAsync from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/response.js';
import { payoutService } from './payout.service.js';

const processAdvancePayouts = catchAsync(async (req, res) => {
  const { userId } = req.body;
  const result = await payoutService.processAdvancePayouts(userId || null);
  return sendResponse(res, 200, 'Advance payouts processed successfully', result);
});

const getPayoutHistory = catchAsync(async (req, res) => {
  const history = await payoutService.getPayoutHistory(req.params.userId);
  return sendResponse(res, 200, 'Payout history fetched successfully', history);
});

export const payoutController = {
  processAdvancePayouts,
  getPayoutHistory,
};
