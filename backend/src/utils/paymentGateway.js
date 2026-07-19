

const FAILURE_CODES = [
  'BANK_DECLINED',
  'INVALID_ACCOUNT',
  'INSUFFICIENT_FUNDS_AT_BANK',
  'NETWORK_TIMEOUT',
  'ACCOUNT_FROZEN',
  'LIMIT_EXCEEDED',
];

export const simulatePayoutGateway = async ({ withdrawalId, amountPaise, userId }) => {
  const delay = Math.floor(Math.random() * 250) + 50;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const isSuccess = Math.random() < 0.7;

  const gatewayRef = `GW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  if (isSuccess) {
    return {
      success: true,
      gatewayRef,
      status: 'SUCCESS',
    };
  }

  const failureReason = FAILURE_CODES[Math.floor(Math.random() * FAILURE_CODES.length)];

  return {
    success: false,
    gatewayRef,
    status: 'FAILED',
    failureReason,
  };
};
