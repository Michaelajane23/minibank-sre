const BASE = '/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  signup: (body) => request('POST', '/signup', body),
  login: (body) => request('POST', '/login', body),
  logout: (token) => request('POST', '/logout', null, token),

  // Account
  getAccount: (token) => request('GET', '/account', null, token),

  // Transactions
  getTransactions: (token, params = '') => request('GET', `/transactions${params}`, null, token),

  // Transfer
  transfer: (body, token) => request('POST', '/transfer', body, token),

  // Payees
  getPayees: (token) => request('GET', '/payees', null, token),
  addPayee: (body, token) => request('POST', '/payees', body, token),
  updatePayee: (id, body, token) => request('PUT', `/payees/${id}`, body, token),
  deletePayee: (id, token) => request('DELETE', `/payees/${id}`, null, token),

  // Pots
  getPots: (token) => request('GET', '/pots', null, token),
  createPot: (body, token) => request('POST', '/pots', body, token),
  depositPot: (id, body, token) => request('POST', `/pots/${id}/deposit`, body, token),
  withdrawPot: (id, body, token) => request('POST', `/pots/${id}/withdraw`, body, token),
  deletePot: (id, token) => request('DELETE', `/pots/${id}`, null, token),

  // Cards
  getCard: (token) => request('GET', '/card', null, token),
  freezeCard: (token) => request('POST', '/card/freeze', null, token),
  unfreezeCard: (token) => request('POST', '/card/unfreeze', null, token),
  replaceCard: (token) => request('POST', '/card/replace', null, token),

  // Analytics
  getAnalytics: (token) => request('GET', '/analytics', null, token)
};
