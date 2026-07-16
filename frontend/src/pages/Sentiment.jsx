import { useState, useEffect } from 'react'
import { getFearGreed, getFearGreedHistory } from '../intelligenceApi'

export default function Sentiment() {
  const [fg, setFg] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [f, h] = await Promise.all([getFearGreed(), getFearGreedHistory(30)])
        if (!active) return
        setFg(f)
        setHistory(h)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 300000)
    return () => { active = false; clearInterval(iv) }
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-text-secondary">Loading sentiment...</div>

  const val = parseInt(fg?.value || 50)
  const classification = fg?.value_classification || 'Neutral'
  const color = val >= 70 ? 'text-[#FFD600]' : val <= 30 ? 'text-red-400' : 'text-yellow-400'
  const bgColor = val >= 70 ? 'bg-[#FFD600]' : val <= 30 ? 'bg-red-400' : 'bg-yellow-400'

  const gaugeAngle = (val / 100) * 180

  const insights = []
  if (val >= 75) insights.push({ text: 'Extreme Greed — Market may be overbought. Consider taking profits.', type: 'warning' })
  else if (val >= 55) insights.push({ text: 'Greed — Bullish sentiment dominating. Stay cautious of reversals.', type: 'info' })
  else if (val <= 25) insights.push({ text: 'Extreme Fear — Potential buying opportunity. Market is oversold.', type: 'opportunity' })
  else if (val <= 45) insights.push({ text: 'Fear — Bearish sentiment. Good accumulation zone for long-term.', type: 'info' })
  else insights.push({ text: 'Neutral — Market is balanced. Wait for clearer signals.', type: 'neutral' })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Market Sentiment</h1>

      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
        <div className="text-text-secondary text-sm mb-2">Fear & Greed Index</div>
        <div className="relative w-48 h-24 mb-2">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <path d="M 10 95 A 90 90 0 0 1 190 95" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" />
            <line x1="100" y1="95" x2={100 + 70 * Math.cos(Math.PI - (gaugeAngle * Math.PI / 180))} y2={95 - 70 * Math.sin(Math.PI - (gaugeAngle * Math.PI / 180))} stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="95" r="5" fill="white" />
          </svg>
        </div>
        <div className={`text-4xl font-bold ${color}`}>{val}</div>
        <div className={`text-sm font-medium ${color} mt-1`}>{classification}</div>
      </div>

      {insights.map((ins, i) => (
        <div key={i} className={`bg-card border rounded-2xl p-4 text-sm ${ins.type === 'opportunity' ? 'border-[#FFD600]/30 text-[#FFD600]' : ins.type === 'warning' ? 'border-yellow-500/30 text-yellow-300' : 'border-border text-text-secondary'}`}>
          {ins.text}
        </div>
      ))}

      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-bold text-sm mb-3">30-Day History</h2>
          <div className="space-y-1">
            {history.map((h, i) => {
              const v = parseInt(h.value || 0)
              const c = v >= 70 ? 'bg-[#FFD600]' : v <= 30 ? 'bg-red-400' : 'bg-yellow-400'
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted w-20">{h.date}</span>
                  <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                    <div className={`h-full ${c} rounded-full`} style={{ width: `${v}%` }} />
                  </div>
                  <span className="w-8 text-right font-medium">{v}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
