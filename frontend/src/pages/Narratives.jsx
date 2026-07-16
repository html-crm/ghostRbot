import { useState, useEffect } from 'react'
import { getTopGainers } from '../intelligenceApi'
import { AlertTriangle, Shield, Search } from 'lucide-react'

const SECTORS = {
  ai: { name: 'AI & ML', coins: ['render-token', 'fetch-ai', 'singularitynet', 'bittensor', 'ocean-protocol'] },
  defi: { name: 'DeFi', coins: ['uniswap', 'aave', 'maker', 'curve-dao-token', 'lido-dao'] },
  gaming: { name: 'Gaming', coins: ['axie-infinity', 'the-sandbox', 'decentraland', 'gala'] },
  layer2: { name: 'Layer 2', coins: ['matic-network', 'arbitrum', 'optimism', 'starknet'] },
  meme: { name: 'Meme', coins: ['dogecoin', 'shiba-inu', 'pepe', 'bonk', 'dogwifcoin'] },
  rwa: { name: 'RWA', coins: ['ondo-finance', 'centrifuge', 'maple-finance'] },
  depin: { name: 'DePIN', coins: ['helium', 'filecoin', 'arweave', 'akash-network'] },
}

function SectorCard({ id, sector, data, rank }) {
  const avgChange = data?.avg_change || 0
  const color = avgChange > 2 ? 'text-[#FFD600]' : avgChange < -2 ? 'text-red-400' : 'text-yellow-400'
  const trend = avgChange > 2 ? 'Inflow' : avgChange < -2 ? 'Outflow' : 'Neutral'
  const trendColor = avgChange > 2 ? 'bg-[#FFD600]/20 text-[#FFD600]' : avgChange < -2 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">{sector.name}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trendColor}`}>{trend}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%</div>
      <div className="text-text-secondary text-xs mt-1">avg 24h change</div>
      {data?.coins && (
        <div className="mt-2 space-y-1">
          {data.coins.slice(0, 3).map((c, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-text-secondary">{c.symbol?.toUpperCase()}</span>
              <span className={c.change >= 0 ? 'text-[#FFD600]' : 'text-red-400'}>{c.change >= 0 ? '+' : ''}{c.change?.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Narratives() {
  const [sectors, setSectors] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const results = {}
        for (const [id, sector] of Object.entries(SECTORS)) {
          try {
            const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${sector.coins.join(',')}&price_change_percentage=24h`)
            if (r.ok) {
              const data = await r.json()
              const avg = data.reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / data.length
              results[id] = {
                avg_change: avg,
                coins: data.map(c => ({ symbol: c.symbol, name: c.name, change: c.price_change_percentage_24h || 0, price: c.current_price })),
              }
            }
          } catch (e) { /* skip */ }
          await new Promise(r => setTimeout(r, 200))
        }
        if (!active) return
        setSectors(results)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 900000)
    return () => { active = false; clearInterval(iv) }
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-text-secondary">Scanning narratives...</div>

  const sorted = Object.entries(sectors).sort((a, b) => (b[1].avg_change || 0) - (a[1].avg_change || 0))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Narrative Detection</h1>
      <p className="text-text-secondary text-sm">Sector performance ranked by average 24h change. Capital flows into winning narratives.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(([id, data], i) => (
          <SectorCard key={id} id={id} sector={SECTORS[id]} data={data} rank={i + 1} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-bold text-sm mb-2">Rotation Summary</h2>
        <div className="space-y-2">
          {sorted.map(([id, data]) => {
            const pct = Math.abs(data.avg_change || 0)
            const barW = Math.min(100, pct * 5)
            const isPositive = data.avg_change >= 0
            return (
              <div key={id} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-text-secondary truncate">{SECTORS[id]?.name}</span>
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden flex">
                  {isPositive ? (
                    <div className="h-full bg-[#FFD600] rounded-full ml-auto" style={{ width: `${barW}%` }} />
                  ) : (
                    <div className="h-full bg-red-400 rounded-full mr-auto" style={{ width: `${barW}%` }} />
                  )}
                </div>
                <span className={`w-14 text-right font-medium ${isPositive ? 'text-[#FFD600]' : 'text-red-400'}`}>
                  {data.avg_change >= 0 ? '+' : ''}{data.avg_change?.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
