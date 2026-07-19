const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

async function fetcher(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

export const api = {
  // Users
  registerUser: (data) => fetcher('/users/register', { method: 'POST', body: JSON.stringify(data) }),
  getAllUsers: () => fetcher('/users'),
  
  // Sales
  getSalesByUser: (userId) => fetcher(`/sales/user/${userId}`),
  createSale: (data) => fetcher('/sales', { method: 'POST', body: JSON.stringify(data) }),
  reconcileSale: (saleId, status) => fetcher(`/sales/${saleId}/reconcile`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  
  // Payouts
  getWalletHistory: (userId) => fetcher(`/payouts/${userId}`),
  triggerAdvancePayout: (userId) => fetcher('/payouts/advance', { method: 'POST', body: JSON.stringify({ userId }) }),
  
  // Withdrawals
  initiateWithdrawal: (data) => fetcher('/withdrawals', { method: 'POST', body: JSON.stringify(data) }),
  resetWithdrawalCooldown: (userId) => fetcher('/withdrawals/reset-cooldown', { method: 'POST', body: JSON.stringify({ userId }) })
};
