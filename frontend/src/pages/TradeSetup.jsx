import { useState, useEffect } from 'react'
import { getDexToken } from '../intelligenceApi'
import { Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function TradeSetup() {
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState('solana')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function analyze() {
    if (!address.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const pair = await getDexToken(address.trim())
      if (!pair) { setError('Token not found'); setLoading(false); return }

      const price = parseFloat(pair.priceUsd || 0)
      const high = parseFloat(pair.high?.h24 || price)
      const low = parseFloat(pair.low?.h24 || price)
      const chg24h = parseFloat(pair.priceChange?.h24 || 0)
      const chg1h = parseFloat(pair.priceChange?.h1 || 0)
      const vol = pair.volume?.h24 || 0
      const liq = pair.liquidity?.usd || 0

      const volatility = price > 0 && high > 0 && low > 0 ? ((high - low) / price) * 100 : 0
      const atr = volatility

      const slPct = Math.max(5, Math.min(20, atr * 1.5 || 10))
      const tpPct = Math.max(10, Math.min(50, (atr * 3) || 25))
      const rr = tpPct / slPct

      const slPrice = price * (1 - slPct / 100)
      const tpPrice = price * (1 + tpPct / 100)

      let signal = 'Watch'
      let confidence = 30
      if (chg24h > 10 && vol > 50000) { signal = 'Buy'; confidence = 65 }
      else if (chg24h > 5 && vol > 20000) { signal = 'Small Buy'; confidence = 55 }
      else if (chg24h < -15) { signal = 'Sell'; confidence = 60 }
      else if (chg24h < -10) { signal = 'Sell'; confidence = 50 }
      else if (chg24h > 20) { signal = 'Take Profit'; confidence = 55 }

      if (liq < 5000) confidence = Math.floor(confidence * 0.5)
      if (volatility > 30) confidence = Math.floor(confidence * 0.8)

      const reasoning = []
      if (chg24h > 0) reasoning.push(`Positive momentum (+${chg24h.toFixed(1)}%)`)
      else reasoning.push(`Negative momentum (${chg24h.toFixed(1)}%)`)
      reasoning.push(vol > 100000 ? 'Strong volume' : vol > 20000 ? 'Moderate volume' : 'Low volume')
      reasoning.push(volatility > 20 ? 'High volatility' : volatility > 10 ? 'Moderate volatility' : 'Low volatility')
      if (liq < 10000) reasoning.push('Low liquidity risk')

      setResult({
        symbol: pair.baseToken?.symbol || '?',
        name: pair.baseToken?.name || '',
        price, high, low, chg24h, chg1h, vol, liq,
        volatility: volatility.toFixed(1),
        slPrice, tpPrice, slPct: slPct.toFixed(1), tpPct: tpPct.toFixed(1), rr: rr.toFixed(1),
        signal, confidence, reasoning,
      })
    } catch (e) { setError('Failed: ' + e.message) }
    setLoading(false)
  }

  const signalColor = (s) => {
    if (s === 'Buy' || s === 'Small Buy') return 'text-[#FFD600] bg-[#FFD600]/20'
    if (s === 'Sell') return 'text-red-400 bg-red-500/20'
    if (s === 'Take Profit') return 'text-yellow-400 bg-yellow-500/20'
    return 'text-text-secondary bg-surface'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trade Setup</h1>
      <p className="text-text-secondary text-sm">Analyze a token for entry zones, stop loss, take profit, and risk/reward.</p>

      <div className="flex gap-2">
        <select value={chain} onChange={e => setChain(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="solana">Solana</option>
          <option value="ethereum">Ethereum</option>
          <option value="bsc">BSC</option>
        </select>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Token contract address..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent" />
        <button onClick={analyze} disabled={loading} className="bg-accent text-black px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-lg">{result.symbol}</div>
                <div className="text-text-secondary text-sm">{result.name}</div>
              </div>
              <div className={`px-3 py-1 rounded-full font-bold text-sm ${signalColor(result.signal)}`}>{result.signal}</div>
            </div>
            <div className="text-3xl font-bold mb-1">${result.price > 0.01 ? result.price.toFixed(4) : result.price.toExponential(2)}</div>
            <div className="flex gap-3 text-sm">
              <span className={result.chg1h >= 0 ? 'text-[#FFD600]' : 'text-red-400'}>1h: {result.chg1h >= 0 ? '+' : ''}{result.chg1h.toFixed(1)}%</span>
              <span className={result.chg24h >= 0 ? 'text-[#FFD600]' : 'text-red-400'}>24h: {result.chg24h >= 0 ? '+' : ''}{result.chg24h.toFixed(1)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Volatility', `${result.volatility}%`],
              ['Volume 24h', `$${(result.vol / 1000).toFixed(0)}K`],
              ['Liquidity', `$${(result.liq / 1000).toFixed(0)}K`],
              ['Confidence', `${result.confidence}%`],
            ].map(([l, v]) => (
              <div key={l} className="bg-card border border-border rounded-xl p-3 text-center">
                <div className="text-text-secondary text-xs">{l}</div>
                <div className="font-bold text-sm mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm">Trade Setup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="text-text-secondary text-xs mb-0.5">Entry Zone</div>
                  <div className="font-bold text-accent">${result.price > 0.01 ? result.price.toFixed(4) : result.price.toExponential(2)}</div>
                </div>
                <div>
                  <div className="text-text-secondary text-xs mb-0.5">Stop Loss</div>
                  <div className="font-bold text-red-400">${result.slPrice > 0.01 ? result.slPrice.toFixed(4) : result.slPrice.toExponential(2)} <span className="text-xs font-normal">(-{result.slPct}%)</span></div>
                </div>
                <div>
                  <div className="text-text-secondary text-xs mb-0.5">Take Profit</div>
                  <div className="font-bold text-[#FFD600]">${result.tpPrice > 0.01 ? result.tpPrice.toFixed(4) : result.tpPrice.toExponential(2)} <span className="text-xs font-normal">(+{result.tpPct}%)</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-text-secondary text-xs mb-0.5">Risk/Reward</div>
                  <div className="font-bold text-xl">1:{result.rr}</div>
                </div>
                <div>
                  <div className="text-text-secondary text-xs mb-0.5">24h Range</div>
                  <div className="text-sm">${result.low?.toFixed(4)} — ${result.high?.toFixed(4)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-2">Reasoning</h3>
            <div className="space-y-1">
              {result.reasoning.map((r, i) => (
                <div key={i} className="text-text-secondary text-sm flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent" /> {r}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-400 text-xs">
            This is not financial advice. Never invest more than you can afford to lose.
          </div>
        </div>
      )}
    </div>
  )
}
