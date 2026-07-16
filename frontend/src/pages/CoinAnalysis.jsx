import { useState, useEffect } from 'react'
import { getCoin } from '../intelligenceApi'
import { Search } from 'lucide-react'

const COINS = [
  { id: 'bitcoin', sym: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', sym: 'ETH', name: 'Ethereum' },
  { id: 'solana', sym: 'SOL', name: 'Solana' },
]

function CoinDetail({ coinId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getCoin(coinId).then(d => { if (active) { setData(d); setLoading(false) } }).catch(() => setLoading(false))
    return () => { active = false }
  }, [coinId])

  if (loading) return <div className="text-text-secondary text-sm py-4">Loading {coinId}...</div>
  if (!data) return <div className="text-text-secondary text-sm py-4">Failed to load</div>

  const md = data.market_data || {}
  const chg1h = md.price_change_percentage_1h_in_currency?.usd || 0
  const chg24h = md.price_change_percentage_24h || 0
  const chg7d = md.price_change_percentage_7d || 0
  const price = md.current_price?.usd || 0
  const ath = md.ath?.usd || 0
  const athPct = md.ath_change_percentage?.usd || 0
  const mcap = md.market_cap?.usd || 0
  const vol = md.total_volume?.usd || 0
  const supply = md.circulating_supply || 0
  const total = md.total_supply || 0
  const community = data.community_data || {}

  const trend = chg24h > 3 ? 'Strong Bullish' : chg24h > 1 ? 'Bullish' : chg24h < -3 ? 'Strong Bearish' : chg24h < -1 ? 'Bearish' : 'Neutral'
  const trendColor = chg24h > 1 ? 'text-[#FFD600]' : chg24h < -1 ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <img src={data.image?.large} alt="" className="w-10 h-10 rounded-full" />
        <div>
          <div className="font-bold text-lg">{data.name} <span className="text-text-secondary text-sm">({data.symbol?.toUpperCase()})</span></div>
          <div className={`text-sm font-medium ${trendColor}`}>{trend}</div>
        </div>
      </div>

      <div className="text-3xl font-bold">${price.toLocaleString(undefined, { maximumFractionDigits: price > 1 ? 2 : 8 })}</div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '1h', val: chg1h },
          { label: '24h', val: chg24h },
          { label: '7d', val: chg7d },
        ].map(({ label, val }) => (
          <div key={label} className="bg-surface rounded-xl p-3 text-center">
            <div className="text-text-secondary text-xs">{label}</div>
            <div className={`font-bold text-sm ${val >= 0 ? 'text-[#FFD600]' : 'text-red-400'}`}>{val >= 0 ? '+' : ''}{val.toFixed(2)}%</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-sm">Market Data</h3>
        {[
          ['Market Cap', `$${(mcap / 1e9).toFixed(2)}B`],
          ['Volume 24h', `$${(vol / 1e9).toFixed(2)}B`],
          ['ATH', `$${ath.toLocaleString()}`],
          ['ATH Distance', `${athPct.toFixed(1)}%`],
          ['Circulating Supply', supply.toLocaleString()],
          ['Total Supply', total ? total.toLocaleString() : 'N/A'],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-text-secondary">{l}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      {community.twitter_followers > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-sm">Community</h3>
          {[
            ['Twitter Followers', community.twitter_followers?.toLocaleString()],
            ['Reddit Subscribers', community.reddit_subscribers?.toLocaleString()],
            ['Telegram Members', community.telegram_channel_user_count?.toLocaleString()],
          ].filter(([, v]) => v && v !== '0').map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-text-secondary">{l}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CoinAnalysis() {
  const [selected, setSelected] = useState('bitcoin')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Coin Analysis</h1>

      <div className="flex gap-2 flex-wrap">
        {COINS.map(c => (
          <button key={c.id} onClick={() => { setSelected(c.id); setShowSearch(false) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selected === c.id && !showSearch ? 'bg-accent text-black' : 'bg-card text-text-secondary hover:text-white'}`}>
            {c.sym}
          </button>
        ))}
        <button onClick={() => setShowSearch(!showSearch)} className="px-4 py-2 rounded-xl text-sm font-medium bg-card text-text-secondary hover:text-white flex items-center gap-1">
          <Search size={14} /> Custom
        </button>
      </div>

      {showSearch && (
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="CoinGecko coin ID (e.g. render-token)"
            className="flex-1 bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent" />
          <button onClick={() => { if (search) setSelected(search) }} className="bg-accent text-black px-4 py-2 rounded-xl text-sm font-medium">Go</button>
        </div>
      )}

      <CoinDetail coinId={selected} />
    </div>
  )
}
