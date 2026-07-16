import { useState, useEffect, useRef } from 'react'
import { BASE } from '../api'
import { Repeat, Repeat1, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink, Plus, X, Loader, Trash2, Square, Activity, Key, Unlink } from 'lucide-react'

const ACTIVE_STATUSES = ['pending', 'buying', 'monitoring', 'selling']

const EXCHANGES = ['bybit', 'binance', 'xt', 'kucoin', 'okx', 'gate', 'mexc', 'bitget']

const DEFAULT_PAIRS = ['SOL/USDT', 'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT', 'MATIC/USDT', 'ATOM/USDT', 'UNI/USDT', 'ARB/USDT', 'OP/USDT', 'PEPE/USDT', 'NEAR/USDT', 'APT/USDT', 'LDO/USDT', 'RUNE/USDT', 'FET/USDT', 'WIF/USDT', 'BONK/USDT']

export default function ExchangeBot() {
  const [orders, setOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [balance, setBalance] = useState(null)
  const [ticker, setTicker] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [symbol, setSymbol] = useState('SOL/USDT')
  const [pairSearch, setPairSearch] = useState('')
  const [showPairDropdown, setShowPairDropdown] = useState(false)
  const [allPairs, setAllPairs] = useState(DEFAULT_PAIRS)
  const [exchangeName, setExchangeName] = useState('Binance')
  const [exchangeConnected, setExchangeConnected] = useState(false)
  const [buyAmount, setBuyAmount] = useState('7')
  const [profitTarget, setProfitTarget] = useState('5')
  const [stopLoss, setStopLoss] = useState('10')
  const [repeatMode, setRepeatMode] = useState(false)
  const [maxRepeats, setMaxRepeats] = useState('0')
  const [reentryDip, setReentryDip] = useState('3')
  const [showAllTxs, setShowAllTxs] = useState(false)
  const [showAllOrders, setShowAllOrders] = useState(false)

  // Credentials state
  const [showConnect, setShowConnect] = useState(false)
  const [credExchange, setCredExchange] = useState('bybit')
  const [credKey, setCredKey] = useState('')
  const [credSecret, setCredSecret] = useState('')
  const [credLoading, setCredLoading] = useState(false)

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [ordersRes, txRes, balRes, tickerRes, credRes] = await Promise.all([
        fetch(`${BASE}/api/exchange/orders?limit=100`, { headers }),
        fetch(`${BASE}/api/exchange/transactions?limit=100`, { headers }),
        fetch(`${BASE}/api/exchange/balance`, { headers }),
        fetch(`${BASE}/api/exchange/ticker?symbol=${encodeURIComponent(symbol)}`, { headers }),
        fetch(`${BASE}/api/exchange/credentials`, { headers }),
      ])
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }
      if (txRes.ok) {
        const data = await txRes.json()
        setTransactions(data.transactions || [])
      }
      if (balRes.ok) setBalance(await balRes.json())
      if (tickerRes.ok) setTicker(await tickerRes.json())
      if (credRes.ok) {
        const cred = await credRes.json()
        setExchangeConnected(cred.connected || false)
      }
    } catch {}
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (symbol) {
      fetch(`/api/exchange/ticker?symbol=${encodeURIComponent(symbol)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok && r.json().then(setTicker)).catch(() => {})
    }
  }, [symbol])

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${BASE}/api/exchange/info`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok && r.json())
      .then(info => {
        if (info?.exchange) setExchangeName(info.exchange)
        if (info?.connected !== undefined) setExchangeConnected(info.connected)
      })
      .catch(() => {})
    fetch(`${BASE}/api/exchange/markets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok && r.json())
      .then(pairs => { if (pairs?.length) setAllPairs(pairs.map(p => p.symbol).filter(s => s.endsWith('/USDT')).slice(0, 100)) })
      .catch(() => {})
  }, [])

  const filteredPairs = pairSearch
    ? allPairs.filter(p => p.toLowerCase().includes(pairSearch.toLowerCase()))
    : allPairs

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.pair-selector')) setShowPairDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCreateOrder = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/exchange/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol,
          spend_usdt: parseFloat(buyAmount),
          profit_target_pct: parseFloat(profitTarget),
          stop_loss_pct: parseFloat(stopLoss),
          repeat: repeatMode,
          max_repeats: repeatMode ? parseInt(maxRepeats) || 0 : 0,
          reentry_dip_pct: parseFloat(reentryDip) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }))
        setMessage({ type: 'error', text: err.detail || 'Failed to create order' })
      } else {
        setMessage({ type: 'success', text: 'Order created! Bot will buy and monitor.' })
      }
      await fetchData()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(false)
  }

  const handleStopOrder = async (orderId) => {
    const token = localStorage.getItem('token')
    await fetch(`/api/exchange/orders/${orderId}/stop`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    await fetchData()
  }

  const handleStopAll = async () => {
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/exchange/stop`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed' }))
        setMessage({ type: 'error', text: err.detail || 'Stop failed' })
      }
      await fetchData()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const handleCloseAll = async () => {
    if (!window.confirm('Sell all open positions at market price?')) return
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/exchange/close-all`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed' }))
        setMessage({ type: 'error', text: err.detail || 'Close failed' })
      }
      await fetchData()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const handleSaveCredentials = async () => {
    setCredLoading(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/exchange/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exchange_name: credExchange, api_key: credKey, api_secret: credSecret }),
      })
      const data = await res.json()
      if (data.status === 'connected') {
        setMessage({ type: 'success', text: `Connected to ${credExchange.toUpperCase()}` })
        setExchangeConnected(true)
        setExchangeName(credExchange.toUpperCase())
        setShowConnect(false)
        setCredKey('')
        setCredSecret('')
      } else {
        setMessage({ type: 'warning', text: 'Credentials saved but connection failed — check keys' })
        setExchangeConnected(true)
      }
      await fetchData()
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
    setCredLoading(false)
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect exchange?')) return
    const token = localStorage.getItem('token')
    await fetch(`${BASE}/api/exchange/credentials`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setExchangeConnected(false)
    setExchangeName('—')
    setBalance(null)
    setMessage({ type: 'success', text: 'Exchange disconnected' })
  }

  const handleClearOrders = async () => {
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/exchange/orders`, {
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
      const res = await fetch(`${BASE}/api/exchange/transactions`, {
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
      const res = await fetch(`/api/exchange/orders/${orderId}`, {
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

  const baseAsset = symbol.split('/')[0] || 'TOKEN'
  const quoteAsset = symbol.split('/')[1] || 'USDT'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with ticker */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-[#FFD600]" size={24} />
          <div>
            <h1 className="text-2xl font-bold">Exchange Bot</h1>
            <p className="text-gray-500 text-sm">{exchangeName} — automated buy, monitor, sell with TP/SL</p>
          </div>
        </div>
        {ticker && (
          <div className="flex items-center gap-3 text-sm bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-800">
            <span className="text-gray-400">{ticker.symbol}</span>
            <span className="font-mono text-white">${ticker.last?.toFixed(4)}</span>
            <span className={`font-mono ${ticker.change >= 0 ? 'text-[#FFD600]' : 'text-red-400'}`}>
              {ticker.change >= 0 ? '+' : ''}{ticker.change?.toFixed(2)}%
            </span>
            <span className="text-gray-500 hidden sm:inline">H: ${ticker.high?.toFixed(4)}</span>
            <span className="text-gray-500 hidden sm:inline">L: ${ticker.low?.toFixed(4)}</span>
          </div>
        )}
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
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          {/* Exchange Connection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {exchangeConnected ? (
                <span className="flex items-center gap-1.5 text-xs text-[#FFD600] bg-[#FFD600]/10 px-2 py-1 rounded-lg border border-[#FFD600]/20">
                  <Activity size={12} className="animate-spin" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg border border-gray-700">
                  <Key size={12} /> Not Connected
                </span>
              )}
              <span className="text-xs text-gray-500 font-mono">{exchangeName}</span>
            </div>
            <button onClick={() => setShowConnect(!showConnect)}
              className="text-xs text-[#FFD600] hover:text-[#FFD600] transition-colors">
              {exchangeConnected ? 'Change' : 'Connect'}
            </button>
          </div>

          {showConnect && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 space-y-3">
              <p className="text-xs text-gray-400">Enter your exchange API credentials. Keys are encrypted and stored per-user.</p>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Exchange</label>
                <select value={credExchange} onChange={(e) => setCredExchange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFD600]">
                  {EXCHANGES.map(ex => <option key={ex} value={ex}>{ex.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">API Key</label>
                <input type="text" value={credKey} onChange={(e) => setCredKey(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#FFD600]"
                  placeholder="Your API key" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">API Secret</label>
                <input type="password" value={credSecret} onChange={(e) => setCredSecret(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#FFD600]"
                  placeholder="Your API secret" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveCredentials} disabled={credLoading || !credKey || !credSecret}
                  className="flex-1 bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                  {credLoading ? <Loader size={14} className="animate-spin" /> : <Key size={14} />}
                  {credLoading ? 'Connecting...' : 'Connect'}
                </button>
                {exchangeConnected && (
                  <button onClick={handleDisconnect}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium px-3 py-2 rounded-lg border border-red-500/20 transition-colors">
                    <Unlink size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <hr className="border-gray-800" />

          <h2 className="text-lg font-semibold">New Order</h2>
          <div className="space-y-4">
            <div className="pair-selector relative">
              <label className="text-sm text-gray-400 block mb-1">Trading Pair</label>
              <input type="text" value={pairSearch || symbol} onChange={(e) => { setPairSearch(e.target.value); setShowPairDropdown(true) }}
                onFocus={() => setShowPairDropdown(true)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#FFD600]"
                placeholder="Search pair..." />
              {showPairDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                  {filteredPairs.slice(0, 50).map(p => (
                    <button key={p} type="button" onClick={() => { setSymbol(p); setPairSearch(''); setShowPairDropdown(false) }}
                      className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-gray-700 transition-colors ${p === symbol ? 'text-[#FFD600] bg-gray-700/50' : 'text-gray-300'}`}>
                      {p}
                    </button>
                  ))}
                  {filteredPairs.length === 0 && <p className="px-4 py-2 text-sm text-gray-500">No pairs found</p>}
                </div>
              )}
            </div>

            <div>
               <label className="text-sm text-gray-400 block mb-1">Buy Amount (USDT)</label>
              <input type="number" step="any" min="5" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]"
                placeholder="10" />
              {ticker?.last > 0 && parseFloat(buyAmount) > 0 && (
                <div className="text-xs text-gray-500 mt-1">≈ {(parseFloat(buyAmount) / ticker.last).toFixed(4)} {baseAsset}</div>
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

            <div>
              <label className="text-sm text-gray-400 block mb-1">Re-entry Dip (%)</label>
              <input type="number" step="0.1" min="0" value={reentryDip} onChange={(e) => setReentryDip(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#FFD600]"
                placeholder="3" />
              <p className="text-xs text-gray-600 mt-1">% pullback before re-buying (repeat only)</p>
            </div>

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
                <label className="text-sm text-gray-400 block mb-1">Max Cycles (0 = 3 default)</label>
                <input type="number" min="0" value={maxRepeats} onChange={(e) => setMaxRepeats(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#FFD600]"
                  placeholder="0" />
              </div>
            )}

            <button onClick={handleCreateOrder} disabled={loading || !symbol || !buyAmount}
              className="w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#FFD600] hover:bg-[#E6C000]">
              <Plus size={18} /> {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>

        {/* Orders (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
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

          {/* Balance card */}
          {balance && (
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{exchangeName} Balances</p>
                  <Activity size={14} className="text-[#FFD600] animate-spin" />
                </div>
                <button onClick={handleCloseAll}
                  className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg text-sm transition-colors">
                  <X size={14} /> Close All
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(balance).slice(0, 6).map(([asset, data]) => (
                  <div key={asset} className="bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/50">
                    <span className="text-xs text-gray-500 uppercase">{asset}</span>
                    <span className="text-sm font-bold font-mono ml-2">{data.total.toFixed(asset === 'USDT' ? 2 : 4)}</span>
                    {data.used > 0 && <span className="text-xs text-yellow-400 ml-1">({data.used.toFixed(4)})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity size={16} className="text-[#FFD600] animate-spin" /> Open Positions ({activeOrders.length})
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
                    <div key={order.id} className="bg-gray-800/50 rounded-lg p-4 border-gray-700/50 border-l-4 border-l-[#FFD600]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium uppercase ${statusColor(order.status)}`}>
                              {order.status === 'pending' && <Loader size={12} className="inline mr-1 animate-spin" />}
                              {order.status === 'buying' && <Loader size={12} className="inline mr-1 animate-spin" />}
                              {order.status === 'monitoring' && <Activity size={12} className="inline mr-1 animate-spin text-[#FFD600]" />}
                              {order.status === 'selling' && <TrendingUp size={12} className="inline mr-1" />}
                              {order.status}
                            </span>
                            {order.repeat && order.cycle_count > 0 && (
                              <span className="text-xs text-[#FFD600] font-mono">#{order.cycle_count}</span>
                            )}
                            {order.repeat && <Repeat1 size={10} className="text-[#FFD600]/60" />}
                            <span className="text-xs text-gray-500">{order.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-sm font-mono font-semibold text-gray-200 mb-1">{order.symbol}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>Buy: {order.amount} {baseAsset}</span>
                            {order.entry_price > 0 && <span>Entry: ${order.entry_price.toFixed(4)}</span>}
                            {order.current_price > 0 && (
                              <span>Price: <span className={order.current_price >= order.entry_price ? 'text-[#FFD600]' : 'text-red-400'}>
                                ${order.current_price.toFixed(4)}
                              </span></span>
                            )}
                            {pnl !== null && pnl !== undefined && (
                              <span className={pnlColor}>
                                P&L: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                              </span>
                            )}
                            {order.buy_filled > 0 && <span>Filled: {order.buy_filled}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleStopOrder(order.id)}
                          className="shrink-0 p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-500 hover:text-red-400"
                          title="Stop this order">
                          <Square size={14} />
                        </button>
                      </div>
                      {order.last_error && (
                        <p className="mt-1 text-xs text-red-400">{order.last_error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed Orders */}
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
                        <span className={`text-xs font-medium uppercase ${statusColor(order.status)}`}>{order.status}</span>
                        <span className="text-xs text-gray-600 font-mono">{order.symbol}</span>
                        {order.repeat && order.cycle_count > 0 && <span className="text-xs text-gray-600">#{order.cycle_count}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>Buy: {order.amount} {baseAsset}</span>
                        {order.entry_price > 0 && <span>@ ${order.entry_price.toFixed(4)}</span>}
                        {order.pnl_pct !== null && (
                          <span className={order.pnl_pct >= 0 ? 'text-[#FFD600]' : 'text-red-400'}>
                            {order.pnl_pct >= 0 ? '+' : ''}{order.pnl_pct}%
                          </span>
                        )}
                        {order.last_error && <span className="text-red-400">{order.last_error}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                      <th className="text-left py-2 px-2">Pair</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-right py-2 px-2">Amount</th>
                      <th className="text-right py-2 px-2">Price</th>
                      <th className="text-right py-2 px-2">P&L</th>
                      <th className="text-right py-2 pl-2">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllTxs ? transactions : transactions.slice(0, 5)).map((tx, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2.5 pr-2 text-gray-400 whitespace-nowrap text-xs">
                          {new Date(tx.time * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-xs">{tx.symbol || '-'}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            tx.type === 'buy' ? 'text-[#FFD600]' : 'text-red-400'
                          }`}>
                            {tx.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs text-gray-300">
                          {tx.amount || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs text-gray-300">
                          {tx.price ? `$${tx.price.toFixed(4)}` : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs">
                          {tx.pnl_pct !== undefined && tx.pnl_pct !== null ? (
                            <span className={tx.pnl_pct >= 0 ? 'text-[#FFD600]' : 'text-red-400'}>
                              {tx.pnl_pct >= 0 ? '+' : ''}{tx.pnl_pct}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          {tx.order_id && (
                            <a href={`https://www.bybit.com/trade/spot/${tx.symbol?.replace('/', '') || 'USDT'}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-[#FFD600] hover:text-[#FFD600] inline-flex items-center gap-1 text-xs font-mono"
                              title={`Order: ${tx.order_id}`}>
                              {tx.order_id.slice(0, 8)}...
                              <ExternalLink size={10} />
                            </a>
                          )}
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
              <TrendingUp className="mx-auto text-gray-600 mb-3" size={40} />
              <p className="text-gray-500">No orders yet. Configure and create your first order!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
