import { useState, useEffect } from 'react'
import { getDexToken } from '../intelligenceApi'
import { Search, AlertTriangle, Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

export default function RiskCheck() {
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState('solana')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function check() {
    if (!address.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const pair = await getDexToken(address.trim())
      if (!pair) {
        setError('Token not found on DexScreener')
        setLoading(false)
        return
      }
      const liq = pair.liquidity?.usd || 0
      const vol = pair.volume?.h24 || 0
      const chg = pair.priceChange?.h24 || 0
      const volLiqRatio = liq > 0 ? vol / liq : 999
      const high24h = pair.high?.h24 || 0
      const low24h = pair.low?.h24 || 0
      const price = parseFloat(pair.priceUsd || 0)

      let riskScore = 0
      const flags = []

      if (liq < 5000) { riskScore += 40; flags.push({ text: 'Very low liquidity (<$5K)', severity: 'high' }) }
      else if (liq < 10000) { riskScore += 20; flags.push({ text: 'Low liquidity (<$10K)', severity: 'medium' }) }
      else if (liq < 50000) { riskScore += 10; flags.push({ text: 'Moderate liquidity (<$50K)', severity: 'low' }) }

      if (volLiqRatio > 20) { riskScore += 25; flags.push({ text: 'Abnormal volume/liquidity ratio', severity: 'high' }) }
      else if (volLiqRatio > 10) { riskScore += 15; flags.push({ text: 'High volume/liquidity ratio', severity: 'medium' }) }

      if (chg < -50) { riskScore += 30; flags.push({ text: 'Extreme price drop (>50%)', severity: 'high' }) }
      else if (chg < -20) { riskScore += 15; flags.push({ text: 'Significant price drop (>20%)', severity: 'medium' }) }

      if (price > 0 && high24h > 0) {
        const fromHigh = ((price - high24h) / high24h) * 100
        if (fromHigh < -80) { riskScore += 20; flags.push({ text: '80%+ below 24h high', severity: 'high' }) }
      }

      const age = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : 999
      if (age < 1) { riskScore += 15; flags.push({ text: 'Token less than 1 hour old', severity: 'medium' }) }
      else if (age < 6) { riskScore += 5; flags.push({ text: 'Token less than 6 hours old', severity: 'low' }) }

      if (vol === 0 && age > 5) { riskScore += 20; flags.push({ text: 'Zero volume', severity: 'high' }) }

      const recommendation = riskScore >= 60 ? 'Avoid' : riskScore >= 40 ? 'High Risk' : riskScore >= 20 ? 'Caution' : 'Lower Risk'

      setResult({
        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || '?',
        price: price,
        liquidity: liq,
        volume: vol,
        priceChange: chg,
        volLiqRatio: volLiqRatio.toFixed(1),
        age: age < 1 ? '<1h' : age < 24 ? `${Math.floor(age)}h` : `${Math.floor(age / 24)}d`,
        dex: pair.dexId || '?',
        pairAddress: pair.pairAddress,
        riskScore: Math.min(100, riskScore),
        flags,
        recommendation,
      })
    } catch (e) {
      setError('Failed to check token: ' + e.message)
    }
    setLoading(false)
  }

  const riskColor = (score) => score >= 60 ? 'text-red-400' : score >= 40 ? 'text-orange-400' : score >= 20 ? 'text-yellow-400' : 'text-[#FFD600]'
  const riskBg = (score) => score >= 60 ? 'bg-red-400' : score >= 40 ? 'bg-orange-400' : score >= 20 ? 'bg-yellow-400' : 'bg-[#FFD600]'
  const riskIcon = (score) => score >= 60 ? <ShieldX className="text-red-400" size={20} /> : score >= 40 ? <ShieldAlert className="text-orange-400" size={20} /> : <ShieldCheck className="text-[#FFD600]" size={20} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Risk Check</h1>
      <p className="text-text-secondary text-sm">Paste a token contract address to analyze its safety profile.</p>

      <div className="flex gap-2">
        <select value={chain} onChange={e => setChain(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent">
          <option value="solana">Solana</option>
          <option value="ethereum">Ethereum</option>
          <option value="bsc">BSC</option>
        </select>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Token contract address..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent" />
        <button onClick={check} disabled={loading} className="bg-accent text-black px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-1">
          <Search size={14} /> {loading ? 'Checking...' : 'Check'}
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4">
            {riskIcon(result.riskScore)}
            <div className="flex-1">
              <div className="font-bold text-lg">{result.symbol} <span className="text-text-secondary text-sm">({result.name})</span></div>
              <div className={`text-2xl font-bold ${riskColor(result.riskScore)}`}>{result.recommendation}</div>
            </div>
            <div className="text-right">
              <div className="text-text-secondary text-xs">Risk Score</div>
              <div className={`text-3xl font-bold ${riskColor(result.riskScore)}`}>{result.riskScore}%</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="h-3 bg-surface rounded-full overflow-hidden mb-3">
              <div className={`h-full ${riskBg(result.riskScore)} rounded-full transition-all`} style={{ width: `${result.riskScore}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Price', `$${result.price > 0.01 ? result.price.toFixed(4) : result.price.toExponential(2)}`],
                ['Liquidity', `$${result.liquidity.toLocaleString()}`],
                ['Volume 24h', `$${result.volume.toLocaleString()}`],
                ['24h Change', `${result.priceChange >= 0 ? '+' : ''}${result.priceChange.toFixed(1)}%`],
                ['Vol/Liq Ratio', result.volLiqRatio],
                ['Age', result.age],
                ['DEX', result.dex],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-text-secondary text-xs">{l}</div>
                  <div className="font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {result.flags.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <h3 className="font-bold text-sm flex items-center gap-1"><AlertTriangle size={14} /> Flags</h3>
              {result.flags.map((f, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${f.severity === 'high' ? 'text-red-400' : f.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${f.severity === 'high' ? 'bg-red-400' : f.severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                  {f.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
