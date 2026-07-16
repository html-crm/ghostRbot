export const BASE = import.meta.env.VITE_API_URL || ''
let onUnauthorized = null

export function setOnUnauthorized(fn) {
  onUnauthorized = fn
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...options.headers, ...(options.skipAuth ? {} : (token ? { 'Authorization': `Bearer ${token}` } : {})) }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal })
    if (res.status === 401) {
      localStorage.removeItem('token')
      if (onUnauthorized) onUnauthorized()
      throw new Error('Unauthorized')
    }
    const data = await res.json()
    if (!res.ok) {
      const detail = data.detail
      const msg = Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join('; ') : (detail || 'Request failed')
      throw new Error(msg)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

export const login = (password) =>
  request('/api/login', { method: 'POST', body: JSON.stringify({ password }), skipAuth: true })

export const verify = () => request('/api/verify')

export const getWallets = () => request('/api/wallets')
export const createWallet = (chain, label) =>
  request('/api/wallets/create', { method: 'POST', body: JSON.stringify({ chain, label }) })
export const importWallet = (chain, label, privateKey) =>
  request('/api/wallets/import', { method: 'POST', body: JSON.stringify({ chain, label, private_key: privateKey }) })
export const deleteWallet = (label) =>
  request(`/api/wallets/${label}`, { method: 'DELETE' })
export const batchCreateWallets = (count, prefix = 'mm', chain = 'solana') =>
  request('/api/wallets/batch', { method: 'POST', body: JSON.stringify({ count, prefix, chain }) })
export const getWalletSecret = (label) =>
  request(`/api/wallets/${label}/secret`)

export const getBalances = () => request('/api/balances')

export const buy = (chain, tokenAddress, amount, slippage = 1) =>
  request('/api/trade/buy', { method: 'POST', body: JSON.stringify({ chain, token_address: tokenAddress, amount, slippage }) })
export const sell = (chain, tokenAddress, amount, slippage = 1) =>
  request('/api/trade/sell', { method: 'POST', body: JSON.stringify({ chain, token_address: tokenAddress, amount, slippage }) })

export const createOrder = (chain, tokenAddress, amount, targetPrice, orderType) =>
  request('/api/orders', { method: 'POST', body: JSON.stringify({ chain, token_address: tokenAddress, amount, target_price: targetPrice, order_type: orderType }) })
export const getOrders = () => request('/api/orders')
export const cancelOrder = (orderId) => request(`/api/orders/${orderId}`, { method: 'DELETE' })

export const exchangeBalance = () => request('/api/exchange/balance')
export const exchangeTicker = (symbol) => request(`/api/exchange/ticker?symbol=${encodeURIComponent(symbol)}`)
export const exchangeCreateOrder = (symbol, side, type, amount, price) =>
  request('/api/exchange/orders', { method: 'POST', body: JSON.stringify({ symbol, side, type, amount, price }) })
export const exchangeOpenOrders = (symbol) => request(`/api/exchange/orders${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''}`)
export const exchangeOrderHistory = (symbol, limit = 20) =>
  request(`/api/exchange/orders/history${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''}${symbol ? '&' : '?'}limit=${limit}`)
export const exchangeCancelOrder = (orderId, symbol) =>
  request(`/api/exchange/orders/${orderId}?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
export const exchangeMarkets = () => request('/api/exchange/markets')

export const getConfig = () => request('/api/config')

export const marketMakerFund = (chain, amountPerWallet, walletLabels) =>
  request('/api/market-maker/fund', { method: 'POST', body: JSON.stringify({ chain, amount_per_wallet: amountPerWallet, wallet_labels: walletLabels }) })
export const marketMakerLiquidity = (chain, tokenAddress, buyAmountPerWallet, slippage, walletLabels) =>
  request('/api/market-maker/liquidity', { method: 'POST', body: JSON.stringify({ chain, token_address: tokenAddress, buy_amount_per_wallet: buyAmountPerWallet, slippage, wallet_labels: walletLabels }) })
export const marketMakerStats = (prefix = 'mm') =>
  request(`/api/market-maker/stats?prefix=${prefix}`)

export const getUsers = (status) => request(`/api/users${status ? `?status=${status}` : ''}`)
export const createUser = (username, password, role = 'vip', permissions = {}) =>
  request('/api/users', { method: 'POST', body: JSON.stringify({ username, password, role, permissions }) })
export const updateUser = (username, data) =>
  request(`/api/users/${username}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteUser = (username) =>
  request(`/api/users/${username}`, { method: 'DELETE' })
export const getCaptcha = () =>
  request('/api/captcha', { skipAuth: true })
export const register = (username, password, email, captchaId, captchaAnswer) =>
  request('/api/register', { method: 'POST', body: JSON.stringify({ username, password, email, captcha_id: captchaId, captcha_answer: captchaAnswer }), skipAuth: true })
export const setUserStatus = (username, status) =>
  request(`/api/users/${username}/status`, { method: 'PUT', body: JSON.stringify({ status }) })

export const forgotPassword = (email) =>
  request('/api/forgot-password', { method: 'POST', body: JSON.stringify({ email }), skipAuth: true })

export const resetPassword = (token, newPassword) =>
  request('/api/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password: newPassword }), skipAuth: true })
