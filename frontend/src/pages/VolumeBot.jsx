import { useState, useEffect, useRef } from 'react'
import { Repeat, Repeat1, Play, Square, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink, Plus, X, Loader, Trash2 } from 'lucide-react'
import { BASE } from '../api'

const CHAINS = {
  solana: { label: 'Solana', currency: 'SOL', color: 'blue', iconBg: 'bg-blue-500/10 text-blue-400', border: 'border-l-blue-500', btnBg: 'bg-blue-500 hover:bg-blue-600', btnInactive: 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600', explorer: 'https://solscan.io' },
  bsc: { label: 'BSC', currency: 'BNB', color: 'yellow', iconBg: 'bg-yellow-500/10 text-yellow-400', border: 'border-l-yellow-500', btnBg: 'bg-yellow-500 hover:bg-yellow-600', btnInactive: 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600', explorer: 'https://bscscan.com' },
}

const SLIPPAGE_OPTIONS = [
  { label: '0.25%', value: 0.25 },
  { label: '0.5%', value: 0.5 },
  { label: '1%', value: 1 },
  { label: '5%', value: 5 },
  { label: 'Auto', value: 10 },
]

const ACTIVE_STATUSES = ['pending', 'buying', 'monitoring', 'selling']

export default function VolumeBot() {
  const [chain, setChain] = useState('solana')
  const [orders, setOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [tokenAddress, setTokenAddress] = useState('')
  const [buyAmount, setBuyAmount] = useState('0.001')
  const [slippage, setSlippage] = useState(0.5)
  const [slippageCustom, setSlippageCustom] = useState('')
  const [profitTarget, setProfitTarget] = useState('5')
  const [stopLoss, setStopLoss] = useState('10')
  const [repeatMode, setRepeatMode] = useState(false)
  const [maxRepeats, setMaxRepeats] = useState('0')
  const [showAllTxs, setShowAllTxs] = useState(false)
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [wallets, setWallets] = useState([])
  const [walletLabel, setWalletLabel] = useState('main')
  const pollRef = useRef(null)
  const c = CHAINS[chain]

  const fetchWallets = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/wallets`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setWallets(await res.json())
    } catch {}
  }


  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [ordersRes, txRes] = await Promise.all([
        fetch(`${BASE}/api/volume/orders?limit=100`, { headers }),
        fetch(`${BASE}/api/volume/transactions?limit=100`, { headers }),
      ])
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }
      if (txRes.ok) {
        const data = await txRes.json()
        setTransactions(data.transactions || [])
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot reach API server' })
    }
  }

  useEffect(() => {
    fetchData()
    fetchWallets()
    pollRef.current = setInterval(fetchData, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  // Auto-select first matching wallet when chain changes
  useEffect(() => {
    const filtered = wallets.filter(w => w.chain === chain).sort((a, b) => a.label === 'main' ? -1 : b.label === 'main' ? 1 : 0)
    if (filtered.length > 0 && !filtered.find(w => w.label === walletLabel)) {
      setWalletLabel(filtered[0].label)
    }
  }, [chain, wallets])

  const getSlippageValue = () => {
    if (slippage === -1) return parseFloat(slippageCustom) || 10
    return slippage
  }

  const handleCreateOrder = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/volume/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          token_address: tokenAddress,
          buy_amount_sol: parseFloat(buyAmount),
          slippage: getSlippageValue(),
          profit_target_pct: parseFloat(profitTarget),
          stop_loss_pct: parseFloat(stopLoss),
          chain: chain,
          wallet_label: walletLabel,
          repeat: repeatMode,
          max_repeats: repeatMode ? parseInt(maxRepeats) || 0 : 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }))
        setMessage({ type: 'error', text: err.detail || 'Failed to create order' })
      } else {
        setMessage({ type: 'success', text: 'Order created!' })
      }
      await fetchData()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(false)
  }

  const handleStopOrder = async (orderId) => {
    const token = localStorage.getItem('token')
    await fetch(`${BASE}/api/volume/orders/${orderId}/stop`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    await fetchData()
  }

  const handleStopAll = async () => {
    const token = localStorage.getItem('token')
    await fetch(`${BASE}/api/volume/stop`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    await fetchData()
  }

  const handleCloseAll = async () => {
    const token = localStorage.getItem('token')
    await fetch(`${BASE}/api/volume/close-all`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    await fetchData()
  }

  const handleClearOrders = async () => {
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/volume/orders`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Order history cleared' })
        await fetchData()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed' }))
        setMessage({ type: 'error', text: err.detail || 'Failed' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const handleClearTransactions = async () => {
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/volume/transactions`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Transaction history cleared' })
        await fetchData()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed' }))
        setMessage({ type: 'error', text: err.detail || 'Failed' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const handleDeleteOrder = async (orderId) => {
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/volume/orders/${orderId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Order deleted' })
        await fetchData()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed' }))
        setMessage({ type: 'error', text: err.detail || 'Failed' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const handleDeleteTransaction = async (txSig) => {
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/volume/transactions/${encodeURIComponent(txSig)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Transaction deleted' })
        await fetchData()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed' }))
        setMessage({ type: 'error', text: err.detail || 'Failed' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const completedOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status))

  const statusColor = (s) => {
    switch (s) {
      case 'pending': return 'text-yellow-400'
      case 'buying': return 'text-blue-400'
      case 'monitoring': return 'text-[#FFD600]'
      case 'selling': return 'text-orange-400'
      case 'completed': return 'text-[#FFD600]'
      case 'stopped': return 'text-gray-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Repeat className="text-[#FFD600]" size={24} />
        <div>
          <h1 className="text-2xl font-bold">Volume Bot</h1>
          <p className="text-gray-500 text-sm">Multiple simultaneous trades — buy, wait for target, sell</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          message.type === 'error'
            ? 'bg-red-500/10 border border-red-500/20'
            : 'bg-[#FFD600]/10 border border-[#FFD600]/20'
        }`}>
          <p className={message.type === 'error' ? 'text-red-300' : 'text-[#FFD600]'}>{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">New Order</h2>
          <div className="space-y-4">
            {/* Chain selector */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Network</label>
              <div className="flex gap-2">
                {Object.entries(CHAINS).map(([key, ch]) => (
                  <button key={key} onClick={() => setChain(key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                      chain === key
                        ? `${ch.btnBg} text-white`
                        : ch.btnInactive
                    }`}>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Wallet selector */}
            <div>
              <label className="text-sm text-gray-400 block mb-1">Wallet</label>
              <select value={walletLabel} onChange={(e) => setWalletLabel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]">
                {wallets.filter(w => w.chain === chain).map(w => (
                  <option key={w.label} value={w.label}>{w.label} ({w.address.slice(0, 6)}...{w.address.slice(-4)})</option>
                ))}
                {wallets.filter(w => w.chain === chain).length === 0 && (
                  <option value="">No {c.label} wallet — create one in Wallets</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Token Address</label>
              <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#FFD600]"
                placeholder="So11111111111111111111111111111111111111112" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Buy Amount ({c.currency})</label>
              <input type="number" step="0.001" min="0" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]"
                placeholder="0.01" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Slippage</label>
              <div className="flex flex-wrap gap-1.5">
                {SLIPPAGE_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => { setSlippage(opt.value); setSlippageCustom('') }}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      slippage === opt.value && slippage !== -1
                        ? 'bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]/50'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button onClick={() => setSlippage(-1)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    slippage === -1
                      ? 'bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]/50'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  Custom
                </button>
              </div>
              {slippage === -1 && (
                <input type="number" step="0.1" value={slippageCustom} onChange={(e) => setSlippageCustom(e.target.value)}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#FFD600]"
                  placeholder="Enter slippage %" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Profit Target (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" value={profitTarget} onChange={(e) => setProfitTarget(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#FFD600]"
                    placeholder="5" />
                  <TrendingUp className="absolute right-3 top-2.5 text-[#FFD600]" size={14} />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Stop Loss (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#FFD600]"
                    placeholder="10" />
                  <TrendingDown className="absolute right-3 top-2.5 text-red-500" size={14} />
                </div>
                <p className="text-xs text-gray-600 mt-1">0 = disabled</p>
              </div>
            </div>
            {/* Repeat Mode Toggle */}
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700/50">
              <div className="flex items-center gap-2">
                <Repeat1 size={16} className="text-[#FFD600]" />
                <div>
                  <span className="text-sm font-medium">Repeat</span>
                  <p className="text-xs text-gray-500">Auto-restart after sell</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={repeatMode} onChange={() => setRepeatMode(!repeatMode)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FFD600]"></div>
              </label>
            </div>
            {repeatMode && (
              <div>
                <label className="text-sm text-gray-400 block mb-1">Max Cycles (0 = infinite)</label>
                <input type="number" min="0" value={maxRepeats} onChange={(e) => setMaxRepeats(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#FFD600]"
                  placeholder="0" />
              </div>
            )}
            <button onClick={handleCreateOrder} disabled={loading || !tokenAddress}
              className={`w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                chain === 'solana' ? 'bg-[#FFD600] hover:bg-[#E6C000]' : 'bg-yellow-500 hover:bg-yellow-600'
              }`}>
              <Plus size={18} /> {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>

        {/* Orders (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Orders Summary */}
          {orders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Active</p>
                <p className="text-xl font-bold mt-1">{activeOrders.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Total</p>
                <p className="text-xl font-bold mt-1">{orders.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Wins</p>
                <p className="text-xl font-bold mt-1 text-[#FFD600]">{orders.filter(o => o.status === 'completed' && (o.pnl_pct || 0) >= 0).length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Losses</p>
                <p className="text-xl font-bold mt-1 text-red-400">{orders.filter(o => o.status === 'completed' && (o.pnl_pct || 0) < 0).length}</p>
              </div>
            </div>
          )}

          {/* Open Positions (Active Orders) */}
          {activeOrders.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Repeat size={18} className="text-[#FFD600]" /> Open Positions ({activeOrders.length})
                </h3>
                <div className="flex gap-2">
                  <button onClick={handleCloseAll}
                    className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg text-sm transition-colors">
                    <X size={14} /> Close All
                  </button>
                  <button onClick={handleStopAll}
                    className="flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm transition-colors">
                    <Square size={14} /> Stop All
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {activeOrders.map(order => {
                  const pnl = order.current_price > 0 && order.entry_price > 0
                    ? ((order.current_price - order.entry_price) / order.entry_price * 100)
                    : order.pnl_pct
                  const pnlColor = pnl !== null && pnl !== undefined && pnl >= 0 ? 'text-[#FFD600]' : 'text-red-400'
                  return (
                    <div key={order.id} className={`bg-gray-800/50 rounded-lg p-4 border-gray-700/50 border-l-4 ${
                      CHAINS[order.chain]?.border || 'border-l-blue-500'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {order.chain && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CHAINS[order.chain]?.iconBg || CHAINS.solana.iconBg}`}>
                                {CHAINS[order.chain]?.label || 'Solana'}
                              </span>
                            )}
                            <span className={`text-xs font-medium uppercase ${statusColor(order.status)}`}>
                              {order.status === 'pending' && <Loader size={12} className="inline mr-1" />}
                              {order.status === 'buying' && <Loader size={12} className="inline mr-1 animate-spin" />}
                              {order.status === 'monitoring' && <Repeat size={12} className="inline mr-1" />}
                              {order.status}
                            </span>
                            {order.repeat && order.repeat_count > 0 && (
                              <span className="text-xs text-[#FFD600] font-mono">#{order.repeat_count}</span>
                            )}
                            {order.repeat && <Repeat1 size={10} className="text-[#FFD600]/60" title="Repeat mode" />}
                            <span className="text-xs text-gray-500">{order.id}</span>
                          </div>
                          <p className="text-sm font-mono truncate text-gray-300 mb-1">
                            {order.token_name ? `${order.token_name} (${order.token_symbol})` : `${order.token_address?.slice(0, 14)}...${order.token_address?.slice(-6)}`}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>Buy: {order.buy_amount_sol} {CHAINS[order.chain]?.currency || 'SOL'}</span>
                            {order.bought_token_raw > 0 && <span>Tokens: {(order.bought_token_raw / (10 ** (order.bought_token_decimals || 6))).toFixed(4)}</span>}
                            {order.entry_price > 0 && <span>Entry: ${order.entry_price.toFixed(8)}</span>}
                            {order.current_price > 0 && (
                              <span>Current: <span className={order.current_price >= order.entry_price ? 'text-[#FFD600]' : 'text-red-400'}>
                                ${order.current_price.toFixed(8)}
                              </span></span>
                            )}
                            {pnl !== null && pnl !== undefined && (
                              <span className={pnlColor}>
                                P&L: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                              </span>
                            )}
                            <span>{Math.floor((order.elapsed_sec || 0) / 60)}m {(order.elapsed_sec || 0) % 60}s</span>
                          </div>
                        </div>
<button onClick={() => handleStopOrder(order.id)}
  className="shrink-0 p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-500 hover:text-red-400"
  title="Stop & sell this order">
  <Square size={14} />
</button>
                      </div>
                      {order.buy_tx && order.chain && (
                        <div className="mt-2 text-xs">
                          <a href={`${CHAINS[order.chain]?.explorer || 'https://solscan.io'}/tx/${order.buy_tx}`} target="_blank" rel="noopener noreferrer"
                            className="text-[#E6C000] hover:text-[#FFD600] inline-flex items-center gap-1">
                            Buy tx: {order.buy_tx.slice(0, 12)}... <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      {order.last_error && (
                        <p className="mt-1 text-xs text-red-400">{order.last_error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed / History Orders */}
          {completedOrders.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Order History</h3>
                <button onClick={handleClearOrders}
                  className="flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm transition-colors">
                  <Trash2 size={14} /> Clear
                </button>
              </div>
              <div className="space-y-2">
                {(showAllOrders ? completedOrders : completedOrders.slice(0, 5)).map(order => (
                  <div key={order.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        {order.chain && (
                          <span className={`text-xs px-1 py-0.5 rounded font-medium ${CHAINS[order.chain]?.iconBg || CHAINS.solana.iconBg}`}>
                            {CHAINS[order.chain]?.label || 'Solana'}
                          </span>
                        )}
                        <span className={`text-xs font-medium uppercase ${statusColor(order.status)}`}>{order.status}</span>
                        <span className="text-xs text-gray-600 font-mono">{order.token_address.slice(0, 8)}...{order.token_address.slice(-4)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>{order.buy_amount_sol} {CHAINS[order.chain]?.currency || 'SOL'}</span>
                        {order.pnl_pct !== null && (
                          <span className={order.pnl_pct >= 0 ? 'text-[#FFD600]' : 'text-red-400'}>
                            {order.pnl_pct >= 0 ? '+' : ''}{order.pnl_pct}%
                          </span>
                        )}
                        {order.last_error && <span className="text-red-400">{order.last_error}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {order.buy_tx && (
                        <a href={`${CHAINS[order.chain]?.explorer || 'https://solscan.io'}/tx/${order.buy_tx}`} target="_blank" rel="noopener noreferrer" className="text-[#E6C000] hover:text-[#FFD600]">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => handleDeleteOrder(order.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {completedOrders.length > 5 && (
                <button onClick={() => setShowAllOrders(!showAllOrders)}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors">
                  {showAllOrders ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show All ({completedOrders.length})</>}
                </button>
              )}
            </div>
          )}

          {/* Transaction History */}
          {transactions.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Transaction History</h3>
                <button onClick={handleClearTransactions}
                  className="flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm transition-colors">
                  <Trash2 size={14} /> Clear
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
                      <th className="text-left py-2 pr-2">Time</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-right py-2 px-2">Amount ({c.currency})</th>
                      <th className="text-right py-2 px-2">Price</th>
                      <th className="text-right py-2 pl-2">Tx</th>
                      <th className="text-right py-2 pl-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllTxs ? transactions : transactions.slice(0, 5)).map((tx, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2.5 pr-2 text-gray-400 whitespace-nowrap text-xs">
                          {new Date(tx.time * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            tx.type === 'buy' ? 'text-[#FFD600]' : 'text-red-400'
                          }`}>
                            {tx.type === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs text-gray-300">
                          {tx.amount_sol?.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs text-gray-300">
                          {tx.price > 0 ? `$${tx.price.toFixed(6)}` : '—'}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <a href={`${CHAINS[tx.chain]?.explorer || 'https://solscan.io'}/tx/${tx.tx_sig}`} target="_blank" rel="noopener noreferrer"
                            className="text-[#FFD600] hover:text-[#FFD600] inline-flex items-center gap-1 text-xs font-mono">
                            {tx.tx_sig?.slice(0, 8)}...
                            <ExternalLink size={10} />
                          </a>
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <button onClick={() => handleDeleteTransaction(tx.tx_sig)}
                            className="text-gray-600 hover:text-red-400 transition-colors p-1">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {transactions.length > 5 && (
                <button onClick={() => setShowAllTxs(!showAllTxs)}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors">
                  {showAllTxs ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show All ({transactions.length})</>}
                </button>
              )}
            </div>
          )}

          {orders.length === 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
              <Repeat className="mx-auto text-gray-600 mb-3" size={40} />
              <p className="text-gray-500">No orders yet. Configure and create your first order!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
