import { useState, useEffect } from 'react'
import { getTopGainers, getTopLosers } from '../intelligenceApi'
import { TrendingUp, TrendingDown } from 'lucide-react'

function CoinCard({ c, type }) {
  const chg = c.price_change_percentage_24h || 0
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={c.image} alt="" className="w-8 h-8 rounded-full" />
        <div>
          <div className="font-bold text-sm">{c.symbol?.toUpperCase()}</div>
          <div className="text-text-secondary text-xs">{c.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">${c.current_price?.toLocaleString(undefined, { maximumFractionDigits: c.current_price > 1 ? 2 : 8 })}</div>
        <div className={`text-sm font-bold ${chg >= 0 ? 'text-[#FFD600]' : 'text-red-400'}`}>
          {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}

export default function GainersLosers() {
  const [gainers, setGainers] = useState([])
  const [losers, setLosers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('gainers')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [g, l] = await Promise.all([getTopGainers(), getTopLosers()])
        if (!active) return
        setGainers(g.slice(0, 15))
        setLosers(l.slice(0, 15))
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 120000)
    return () => { active = false; clearInterval(iv) }
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-text-secondary">Loading...</div>

  const list = tab === 'gainers' ? gainers : losers

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Top Movers</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('gainers')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'gainers' ? 'bg-[#FFD600]/20 text-[#FFD600]' : 'bg-card text-text-secondary hover:text-white'}`}>
          <TrendingUp size={16} /> Gainers
        </button>
        <button onClick={() => setTab('losers')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'losers' ? 'bg-red-500/20 text-red-400' : 'bg-card text-text-secondary hover:text-white'}`}>
          <TrendingDown size={16} /> Losers
        </button>
      </div>

      <div className="space-y-2">
        {list.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="text-text-muted text-xs w-6 text-right">{i + 1}</span>
            <div className="flex-1"><CoinCard c={c} type={tab} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
