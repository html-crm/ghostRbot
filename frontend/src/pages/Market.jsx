import { useState, useEffect } from 'react'
import { getGlobalData, getCoins, getFearGreed, getTrending } from '../intelligenceApi'
import { TrendingUp, TrendingDown, Globe, Flame, Activity } from 'lucide-react'

const MAJOR = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'uniswap']
const SYM = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB', ripple: 'XRP', cardano: 'ADA', 'avalanche-2': 'AVAX', polkadot: 'DOT', chainlink: 'LINK', uniswap: 'UNI' }

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="text-text-secondary text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-text-secondary text-xs mt-1">{sub}</div>}
    </div>
  )
}

function CoinRow({ c }) {
  const chg = c.price_change_percentage_24h_in_currency || 0
  const chg7d = c.price_change_percentage_7d_in_currency || 0
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <img src={c.image} alt="" className="w-7 h-7 rounded-full" />
        <div>
          <div className="font-medium text-sm">{c.symbol?.toUpperCase()}</div>
          <div className="text-text-secondary text-xs">{c.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">${c.current_price?.toLocaleString(undefined, { maximumFractionDigits: c.current_price > 1 ? 2 : 6 })}</div>
        <div className={`text-xs font-medium ${chg >= 0 ? 'text-[#FFD600]' : 'text-red-400'}`}>
          {chg >= 0 ? '+' : ''}{chg.toFixed(1)}% <span className="text-text-muted">/ {chg7d >= 0 ? '+' : ''}{chg7d.toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-right text-xs text-text-secondary hidden sm:block">
        ${c.market_cap ? (c.market_cap / 1e9).toFixed(1) + 'B' : '-'}
      </div>
    </div>
  )
}

export default function Market() {
  const [global, setGlobal] = useState(null)
  const [coins, setCoins] = useState([])
  const [fg, setFg] = useState(null)
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [g, c, f, t] = await Promise.all([
          getGlobalData(), getCoins(MAJOR), getFearGreed(), getTrending()
        ])
        if (!active) return
        setGlobal(g)
        setCoins(c)
        setFg(f)
        setTrending(t)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 60000)
    return () => { active = false; clearInterval(iv) }
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-text-secondary">Loading market data...</div>

  const fgVal = parseInt(fg?.value || 50)
  const fgColor = fgVal >= 70 ? 'text-[#FFD600]' : fgVal <= 30 ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Market Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Market Cap" value={`$${((global?.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T`} sub={`${(global?.market_cap_change_percentage_24h_usd || 0) >= 0 ? '+' : ''}${(global?.market_cap_change_percentage_24h_usd || 0).toFixed(2)}% 24h`} color={(global?.market_cap_change_percentage_24h_usd || 0) >= 0 ? 'text-[#FFD600]' : 'text-red-400'} />
        <StatCard label="24h Volume" value={`$${((global?.total_volume?.usd || 0) / 1e9).toFixed(1)}B`} />
        <StatCard label="BTC Dominance" value={`${(global?.market_cap_percentage?.btc || 0).toFixed(1)}%`} />
        <StatCard label="Fear & Greed" value={`${fgVal}`} sub={fg?.value_classification} color={fgColor} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {coins.filter(c => ['BTC', 'ETH', 'SOL'].includes(c.symbol?.toUpperCase())).map(c => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={c.image} alt="" className="w-6 h-6 rounded-full" />
              <span className="font-bold">{c.symbol?.toUpperCase()}</span>
            </div>
            <div className="text-xl font-bold">${c.current_price?.toLocaleString()}</div>
            <div className={`text-sm font-medium ${(c.price_change_percentage_24h_in_currency || 0) >= 0 ? 'text-[#FFD600]' : 'text-red-400'}`}>
              {(c.price_change_percentage_24h_in_currency || 0) >= 0 ? '+' : ''}{(c.price_change_percentage_24h_in_currency || 0).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {trending.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-orange-400" />
            <h2 className="font-bold text-sm">Trending</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trending.slice(0, 8).map((t, i) => (
              <span key={i} className="bg-accent/10 text-accent text-xs px-3 py-1.5 rounded-full font-medium">
                {t.symbol?.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-accent" />
          <h2 className="font-bold text-sm">Top Coins</h2>
        </div>
        {coins.map(c => <CoinRow key={c.id} c={c} />)}
      </div>
    </div>
  )
}
