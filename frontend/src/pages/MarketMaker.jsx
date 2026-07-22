import { useState, useEffect } from 'react'
import { Layers, Plus, Trash2, Copy, Eye, EyeOff, ExternalLink, Loader, Wallet, AlertTriangle, Send, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import { BASE, batchCreateWallets } from '../api'

const CHAINS = {
  solana: { label: 'Solana', currency: 'SOL', color: 'blue', iconBg: 'bg-blue-500/10 text-blue-400', btnBg: 'bg-blue-500 hover:bg-blue-600' },
  bsc: { label: 'BSC', currency: 'BNB', color: 'yellow', iconBg: 'bg-yellow-500/10 text-yellow-400', btnBg: 'bg-yellow-500 hover:bg-yellow-600' },
}

const explorers = {
  solana: (addr) => `https://solscan.io/account/${addr}`,
  bsc: (addr) => `https://bscscan.com/address/${addr}`,
}

function WalletItem({ w, visibleSecrets, toggleSecret, copyToClipboard, handleDelete }) {
  const wChain = CHAINS[w.chain] || CHAINS.solana
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 border-l-4 ${
      w.chain === 'bsc' ? 'border-l-yellow-500' : 'border-l-blue-500'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${wChain.iconBg}`}>{wChain.label}</span>
            <span className="text-xs font-mono text-[#FFD600]">{w.label}</span>
            <span className="text-xs font-mono text-gray-500 truncate">{w.address?.slice(0, 8)}...{w.address?.slice(-6)}</span>
            <button onClick={() => copyToClipboard(w.address)}
              className="text-gray-600 hover:text-gray-300 transition-colors">
              <Copy size={12} />
            </button>
            <a href={explorers[w.chain]?.(w.address) || '#'} target="_blank" rel="noreferrer"
              className="text-gray-600 hover:text-gray-300 transition-colors" title={`View on ${wChain.label} explorer`}>
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-900 rounded px-2 py-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono text-gray-600 truncate flex-1">
                  {visibleSecrets[w.label] ? w.secret : '•'.repeat(Math.min(w.secret?.length || 40, 40))}
                </span>
              </div>
            </div>
            <button onClick={() => toggleSecret(w.label)}
              className="text-gray-600 hover:text-gray-300 transition-colors" title={visibleSecrets[w.label] ? 'Hide' : 'Show'}>
              {visibleSecrets[w.label] ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button onClick={() => copyToClipboard(w.secret)}
              className="text-gray-600 hover:text-gray-300 transition-colors" title="Copy seed">
              <Copy size={14} />
            </button>
            <button onClick={() => handleDelete(w.label)}
              className="text-gray-600 hover:text-red-400 transition-colors" title="Delete wallet">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarketMaker() {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [genCount, setGenCount] = useState('5')
  const [genPrefix, setGenPrefix] = useState('mm')
  const [genChain, setGenChain] = useState('solana')
  const [visibleSecrets, setVisibleSecrets] = useState({})
  const [tokenAddress, setTokenAddress] = useState('')
  const [liqAmount, setLiqAmount] = useState('0.1')
  const [seedModal, setSeedModal] = useState(null)
  const [seedAcknowledged, setSeedAcknowledged] = useState(false)
  const [activeTab, setActiveTab] = useState('trading')
  const [showWallets, setShowWallets] = useState(false)

  const chain = CHAINS[genChain]

  const fetchWallets = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/wallets`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setWallets(await res.json())
    } catch {}
  }

  useEffect(() => { fetchWallets() }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setMessage(null)
    setSeedAcknowledged(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/wallets/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: parseInt(genCount) || 5, prefix: genPrefix, chain: genChain }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server error' }))
        setMessage({ type: 'error', text: err.detail || 'Failed to generate wallets' })
      } else {
        const data = await res.json()
        setMessage({ type: 'success', text: `Created ${data.wallets.length} ${chain.label} wallet(s)` })
        setSeedModal(data.wallets)
        fetchWallets()
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(false)
  }

  const dismissSeedModal = () => {
    if (!seedAcknowledged) return
    setSeedModal(null)
    setSeedAcknowledged(false)
  }

  const handleDelete = async (label) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${BASE}/api/wallets/${label}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      fetchWallets()
    } catch {}
  }

  const toggleSecret = (label) => {
    setVisibleSecrets(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const mmWallets = wallets.filter(w => w.label?.startsWith(genPrefix))
  const mmLabels = mmWallets.map(w => w.label)

  const handleFund = async () => {
    if (mmLabels.length === 0) {
      setMessage({ type: 'error', text: 'No wallets to fund' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const res = await fetch(`${BASE}/api/market-maker/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chain: genChain, amount_per_wallet: parseFloat(liqAmount) || 0.01, wallet_labels: mmLabels }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Funding failed')
      const funded = data.funded || 0
      const failed = data.failed || 0
      const fundErrors = data.details?.filter(d => d.status === 'error').map(d => `${d.label}: ${d.error}`).join('; ')
      setMessage({ type: funded > 0 ? 'success' : 'error', text: `Funded ${funded} wallet(s) (${failed} failed) with ${parseFloat(liqAmount) || 0.01} ${chain.currency} each${fundErrors ? `\nErrors: ${fundErrors}` : ''}` })
      fetchWallets()
    } catch (e) {
      setMessage({ type: 'error', text: e.name === 'AbortError' ? 'Request timed out' : e.message })
    }
    setLoading(false)
  }

  const handleCreateLiquidity = async () => {
    if (mmLabels.length === 0) {
      setMessage({ type: 'error', text: 'No wallets to create liquidity with' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000)
      const res = await fetch(`${BASE}/api/market-maker/liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chain: genChain, token_address: tokenAddress, buy_amount_per_wallet: parseFloat(liqAmount) || 0.01, slippage: 5.0, wallet_labels: mmLabels }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Liquidity creation failed')
      const buys = data.buys || 0
      const failed = data.failed || 0
      const errorDetails = data.details?.filter(d => d.status === 'error').map(d => `${d.label}: ${d.error}`).join('; ')
      setMessage({ type: buys > 0 ? 'success' : 'error', text: `Bought token from ${buys} wallet(s) (${failed} failed) — ${chain.currency} volume: ${(buys * (parseFloat(liqAmount) || 0.01)).toFixed(4)} ${chain.currency}${errorDetails ? `\nErrors: ${errorDetails}` : ''}` })
      fetchWallets()
    } catch (e) {
      setMessage({ type: 'error', text: e.name === 'AbortError' ? 'Request timed out' : e.message })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Seed phrase security modal */}
      {seedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold">Save Your Seed Phrases</h2>
            </div>
            <p className="text-sm text-gray-400">
              These seed phrases are shown <strong className="text-amber-300">once only</strong>. After closing this window, you must use the "Show" button next to each wallet to view them again.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 space-y-1">
              <p>⚠ Never share seed phrases with anyone.</p>
              <p>⚠ Store them offline (paper wallet or encrypted backup).</p>
              <p>⚠ Anyone with these seeds controls the wallets.</p>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {seedModal.map(w => (
                <div key={w.label} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs font-mono text-[#FFD600] mb-1">{w.label}</div>
                  <div className="text-xs font-mono text-gray-400 break-all bg-gray-900 rounded px-2 py-1.5">{w.secret}</div>
                </div>
              ))}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={seedAcknowledged} onChange={(e) => setSeedAcknowledged(e.target.checked)}
                className="mt-0.5 accent-[#FFD600]" />
              <span className="text-sm text-gray-400">I have saved all seed phrases securely</span>
            </label>
            <button onClick={dismissSeedModal} disabled={!seedAcknowledged}
              className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-40 disabled:cursor-not-allowed text-black font-medium py-2.5 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Layers className="text-[#FFD600]" size={24} />
        <div>
          <h1 className="text-2xl font-bold">Market Maker</h1>
          <p className="text-gray-500 text-sm">Generate wallets and manage liquidity for your tokens</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-900 rounded-xl border border-gray-800 p-1">
        <button
          onClick={() => setActiveTab('trading')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'trading'
              ? 'bg-[#FFD600] text-black'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Trading
        </button>
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'wallets'
              ? 'bg-[#FFD600] text-black'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Wallet size={16} className="inline mr-2" />
          Wallets
          {wallets.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-700 rounded-full">{wallets.length}</span>
          )}
        </button>
      </div>

      {message && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          message.type === 'error'
            ? 'bg-red-500/10 border border-red-500/20'
            : message.type === 'info'
            ? 'bg-blue-500/10 border border-blue-500/20'
            : 'bg-[#FFD600]/10 border border-[#FFD600]/20'
        }`}>
          <div className={message.type === 'error' ? 'text-red-300 text-sm' : message.type === 'info' ? 'text-blue-300 text-sm' : 'text-[#FFD600] text-sm'}>
            {message.text.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Trading Tab */}
      {activeTab === 'trading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Wallet Generation */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-[#FFD600]" /> Generate Wallets
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Network</label>
                <div className="flex gap-2">
                  {Object.entries(CHAINS).map(([key, c]) => (
                    <button key={key} onClick={() => setGenChain(key)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                        genChain === key
                          ? `${c.btnBg} border-${c.color}-500 text-white`
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Count</label>
                  <input type="number" min="1" max="100" value={genCount} onChange={(e) => setGenCount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Label Prefix</label>
                  <input type="text" value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]"
                    placeholder="mm" />
                </div>
              </div>
              <button onClick={handleGenerate} disabled={loading}
                className={`w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  genChain === 'solana' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}>
                {loading ? <Loader size={16} className="animate-spin" /> : <Plus size={18} />}
                {loading ? 'Working...' : `Generate ${chain.label} Wallets`}
              </button>
              {mmWallets.length > 0 && (
                <button onClick={handleFund} disabled={loading}
                  className="w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#FFD600] hover:bg-[#E6C000]">
                  {loading ? <Loader size={16} className="animate-spin" /> : <Send size={18} />}
                  {loading ? 'Working...' : `Fund ${mmWallets.length} Wallet(s) with ${liqAmount || '0.01'} ${chain.currency}`}
                </button>
              )}
            </div>

            {mmWallets.length > 0 && (
              <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-500 mb-2">{mmWallets.length} wallet(s)</p>
                {mmWallets.map(w => {
                  const wChain = CHAINS[w.chain] || CHAINS.solana
                  return (
                    <div key={w.label} className={`bg-gray-800/50 rounded-lg p-3 border-l-4 ${
                      w.chain === 'bsc' ? 'border-l-yellow-500' : 'border-l-blue-500'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${wChain.iconBg}`}>{wChain.label}</span>
                            <span className="text-xs font-mono text-[#FFD600]">{w.label}</span>
                            <span className="text-xs font-mono text-gray-500 truncate">{w.address?.slice(0, 8)}...{w.address?.slice(-6)}</span>
                            <button onClick={() => copyToClipboard(w.address)}
                              className="text-gray-600 hover:text-gray-300 transition-colors">
                              <Copy size={12} />
                            </button>
                            <a href={explorers[w.chain]?.(w.address) || '#'} target="_blank" rel="noreferrer"
                              className="text-gray-600 hover:text-gray-300 transition-colors" title={`View on ${wChain.label} explorer`}>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-900 rounded px-2 py-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono text-gray-600 truncate flex-1">
                                  {visibleSecrets[w.label] ? w.secret : '•'.repeat(Math.min(w.secret?.length || 40, 40))}
                                </span>
                              </div>
                            </div>
                            <button onClick={() => toggleSecret(w.label)}
                              className="text-gray-600 hover:text-gray-300 transition-colors" title={visibleSecrets[w.label] ? 'Hide' : 'Show'}>
                              {visibleSecrets[w.label] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => copyToClipboard(w.secret)}
                              className="text-gray-600 hover:text-gray-300 transition-colors" title="Copy seed">
                              <Copy size={14} />
                            </button>
                            <button onClick={() => handleDelete(w.label)}
                              className="text-gray-600 hover:text-red-400 transition-colors" title="Delete wallet">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Liquidity Creation */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers size={18} className="text-[#FFD600]" /> Create Liquidity
            </h2>
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-2">Network</label>
              <div className="flex gap-2">
                {Object.entries(CHAINS).map(([key, c]) => (
                  <button key={key} onClick={() => setGenChain(key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                      genChain === key
                        ? `${c.btnBg} border-${c.color}-500 text-white`
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Token Address</label>
                <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#FFD600]"
                  placeholder="JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">{chain.currency} per Wallet</label>
                <input type="number" step="any" value={liqAmount} onChange={(e) => setLiqAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]"
                  placeholder="0.1" />
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Wallets to use</span>
                  <span className="text-gray-200 font-medium">{mmWallets.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total {chain.currency} needed</span>
                  <span className="text-gray-200 font-medium">{(mmWallets.length * parseFloat(liqAmount || 0)).toFixed(4)} {chain.currency}</span>
                </div>
              </div>
              <button onClick={handleCreateLiquidity} disabled={loading || !tokenAddress || mmWallets.length === 0}
                className={`w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  genChain === 'solana' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}>
                {loading ? <Loader size={16} className="animate-spin" /> : <TrendingUp size={18} />}
                {loading ? 'Working...' : `Buy Token from ${mmWallets.length} Wallet(s)`}
              </button>
              <p className="text-xs text-gray-600 text-center">
                Each wallet buys the token, creating buy pressure and trading volume.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-[#FFD600]" /> Generate Wallets
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Network</label>
                <div className="flex gap-2">
                  {Object.entries(CHAINS).map(([key, c]) => (
                    <button key={key} onClick={() => setGenChain(key)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                        genChain === key
                          ? `${c.btnBg} border-${c.color}-500 text-white`
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Count</label>
                  <input type="number" min="1" max="100" value={genCount} onChange={(e) => setGenCount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Label Prefix</label>
                  <input type="text" value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]"
                    placeholder="mm" />
                </div>
              </div>
              <button onClick={handleGenerate} disabled={loading}
                className={`w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  genChain === 'solana' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}>
                {loading ? <Loader size={16} className="animate-spin" /> : <Plus size={18} />}
                {loading ? 'Working...' : `Generate ${chain.label} Wallets`}
              </button>
              {mmWallets.length > 0 && (
                <button onClick={handleFund} disabled={loading}
                  className="w-full disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#FFD600] hover:bg-[#E6C000]">
                  {loading ? <Loader size={16} className="animate-spin" /> : <Send size={18} />}
                  {loading ? 'Working...' : `Fund ${mmWallets.length} Wallet(s) with ${liqAmount || '0.01'} ${chain.currency}`}
                </button>
              )}
            </div>
          </div>

          {/* Wallet List - Collapsible */}
          {mmWallets.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800">
              <button
                onClick={() => setShowWallets(!showWallets)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wallet size={18} className="text-[#FFD600]" />
                  <span className="font-semibold">{mmWallets.length} MM Wallet(s)</span>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                      {mmWallets.filter(w => w.chain === 'solana').length} SOL
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                      {mmWallets.filter(w => w.chain === 'bsc').length} BSC
                    </span>
                  </div>
                </div>
                {showWallets ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
              </button>

              {showWallets && (
                <div className="px-4 pb-4 space-y-4">
                  {mmWallets.filter(w => w.chain === 'solana').length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        Solana Wallets
                      </h3>
                      <div className="space-y-2">
                        {mmWallets.filter(w => w.chain === 'solana').map(w => (
                          <WalletItem key={w.label} w={w} visibleSecrets={visibleSecrets} toggleSecret={toggleSecret} copyToClipboard={copyToClipboard} handleDelete={handleDelete} />
                        ))}
                      </div>
                    </div>
                  )}

                  {mmWallets.filter(w => w.chain === 'bsc').length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        BSC Wallets
                      </h3>
                      <div className="space-y-2">
                        {mmWallets.filter(w => w.chain === 'bsc').map(w => (
                          <WalletItem key={w.label} w={w} visibleSecrets={visibleSecrets} toggleSecret={toggleSecret} copyToClipboard={copyToClipboard} handleDelete={handleDelete} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {mmWallets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">MM Wallets</p>
                <p className="text-xl font-bold mt-1">{mmWallets.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Total Wallets</p>
                <p className="text-xl font-bold mt-1">{wallets.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Solana</p>
                <p className="text-xl font-bold mt-1 text-blue-400">{wallets.filter(w => w.chain === 'solana').length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wide">BSC</p>
                <p className="text-xl font-bold mt-1 text-yellow-400">{wallets.filter(w => w.chain === 'bsc').length}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
