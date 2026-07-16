import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BASE } from '../api'
import { Wallet, TrendingUp, Repeat, ExternalLink, Loader, Clock, ArrowUpRight, ArrowDownRight, Activity, ChevronDown, ChevronUp } from 'lucide-react'

const CHAINS = {
  solana: { label: 'Solana', currency: 'SOL', explorer: 'https://solscan.io' },
  bsc: { label: 'BSC', currency: 'BNB', explorer: 'https://bscscan.com' },
}

const statusBadge = (s) => {
  switch (s) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'buying': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'monitoring': return 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20'
    case 'selling': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'completed': return 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20'
    case 'stopped': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20'
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-[#1A1400] rounded-[16px] border border-[#2A2000] p-5 lg:p-6 flex flex-col gap-3 hover:border-[#FFD600]/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-[#6B7D9E] font-medium">{label}</span>
      </div>
      <div>
        <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-[#6B7D9E] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function PositionCard({ pos, t, isAr }) {
  const c = CHAINS[pos.chain] || CHAINS.solana
  const isVolume = pos.source === 'volume'
  const isLimit = pos.source === 'limit'
  const isExchange = pos.source === 'exchange'
  const pnlNum = pos.pnl !== null ? parseFloat(pos.pnl) : null
  const isPositive = pnlNum !== null && pnlNum >= 0

  return (
    <div className="bg-[#1A1400] rounded-[16px] border border-[#2A2000] p-4 hover:border-[#FFD600]/20 transition-colors">
      <div className={`flex items-start justify-between gap-3 mb-3 ${isAr ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 min-w-0 ${isAr ? 'flex-row-reverse' : ''}`}>
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${isLimit ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : isExchange ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
            {isLimit ? 'LIMIT' : isExchange ? 'EXCHANGE' : pos.chain?.toUpperCase()}
          </span>
          {isLimit && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${pos.type === 'TP' ? 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {pos.type}
            </span>
          )}
          {!isLimit && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${statusBadge(pos.status)}`}>
              {pos.status === 'buying' && <Loader size={10} className="inline mr-1 animate-spin" />}
              {pos.status === 'monitoring' && <Activity size={10} className="inline mr-1 animate-spin" />}
              {pos.status}
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#3B4B6E] font-mono shrink-0">{pos.id?.slice(0, 8)}</span>
      </div>

      <p className="text-sm font-mono text-gray-300 truncate mb-3">
        {isExchange ? pos.symbol : (pos.token_address?.slice(0, 18) + '...' + pos.token_address?.slice(-4))}
      </p>

      <div className={`grid grid-cols-2 gap-2 text-xs mb-3 ${isAr ? 'text-right' : ''}`}>
        <div>
          <span className="text-[#6B7D9E]">{t('type')}</span>
          <p className="text-gray-300 font-medium">{pos.type}</p>
        </div>
        <div>
          <span className="text-[#6B7D9E]">{t('amount')}</span>
          <p className="text-gray-300 font-medium">{pos.amount} {isLimit ? '' : isExchange ? '' : c.currency}</p>
        </div>
        {pos.entry_price > 0 && (
          <div>
            <span className="text-[#6B7D9E]">{t('entry')}</span>
            <p className="text-gray-300 font-medium">${parseFloat(pos.entry_price).toFixed(isExchange ? 4 : 8)}</p>
          </div>
        )}
        {pos.current_price > 0 && (
          <div>
            <span className="text-[#6B7D9E]">{t('current')}</span>
            <p className={`font-medium ${pos.current_price >= pos.entry_price ? 'text-[#FFD600]' : 'text-red-400'}`}>
              ${parseFloat(pos.current_price).toFixed(isExchange ? 4 : 8)}
            </p>
          </div>
        )}
      </div>

      <div className={`flex items-center justify-between pt-3 border-t border-[#1A2744] ${isAr ? 'flex-row-reverse' : ''}`}>
        {pnlNum !== null ? (
            <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-[#FFD600]' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {isPositive ? '+' : ''}{pnlNum.toFixed(2)}%
          </div>
        ) : (
          <span className="text-xs text-[#6B7D9E]">—</span>
        )}
        <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
          {pos.elapsed > 0 && (
            <span className="text-xs text-[#6B7D9E] flex items-center gap-1">
              <Clock size={11} />
              {Math.floor(pos.elapsed / 60)}m {pos.elapsed % 60}s
            </span>
          )}
          {pos.tx && (
            <a href={`${c.explorer}/tx/${pos.tx}`} target="_blank" rel="noopener noreferrer"
              className="text-[#6B7D9E] hover:text-[#FFD600] transition-colors p-1" title={t('view_tx')}>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {pos.error && <p className="mt-2 text-xs text-red-400 bg-red-500/5 rounded-lg p-2">{pos.error}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const [balances, setBalances] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBalances, setShowBalances] = useState(false)
  const pollRef = useRef(null)

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const { getBalances } = await import('../api')
      const [balRes, ordRes, limRes, excRes] = await Promise.all([
        getBalances(),
        fetch(`${BASE}/api/volume/orders?active_only=true&limit=50`, { headers }),
        fetch(`${BASE}/api/orders`, { headers }),
        fetch(`${BASE}/api/exchange/orders?limit=50`, { headers }),
      ])
      if (Array.isArray(balRes)) setBalances(balRes)

      const activeStatuses = ['pending', 'buying', 'monitoring', 'selling']
      const all = []
      if (ordRes.ok) {
        const data = await ordRes.json()
        for (const o of data.orders || []) {
          all.push({
            id: o.id, source: 'volume', chain: o.chain || 'solana',
            token_address: o.token_address, type: 'Buy',
            amount: `${o.buy_amount_sol} ${CHAINS[o.chain]?.currency || 'SOL'}`,
            entry_price: o.entry_price, current_price: o.current_price,
            pnl: o.current_price > 0 && o.entry_price > 0
              ? ((o.current_price - o.entry_price) / o.entry_price * 100).toFixed(2)
              : (o.pnl_pct != null ? o.pnl_pct.toFixed(2) : null),
            status: o.status, elapsed: o.elapsed_sec || 0, tx: o.buy_tx, error: o.last_error,
          })
        }
      }
      if (limRes.ok) {
        const orders = await limRes.json()
        for (const o of orders) {
          if (!o.executed) {
            all.push({
              id: o.order_id, source: 'limit', chain: o.chain || 'solana',
              token_address: o.token_address, type: o.order_type === 'take_profit' ? 'TP' : 'SL',
              amount: o.amount, entry_price: o.target_price, current_price: null, pnl: null,
              status: 'pending', elapsed: 0, tx: null, error: null, target_price: o.target_price,
            })
          }
        }
      }
      if (excRes.ok) {
        const data = await excRes.json()
        for (const o of data.orders || []) {
          if (activeStatuses.includes(o.status)) {
            const pnl = o.current_price > 0 && o.entry_price > 0
              ? ((o.current_price - o.entry_price) / o.entry_price * 100).toFixed(2)
              : (o.pnl_pct != null ? o.pnl_pct.toFixed(2) : null)
            all.push({
              id: o.id, source: 'exchange', chain: 'solana',
              symbol: o.symbol, type: o.order_type === 'limit' ? 'Limit' : 'Market',
              amount: o.amount, entry_price: o.entry_price, current_price: o.current_price,
              pnl, status: o.status, elapsed: o.elapsed_sec || 0, tx: null, error: o.last_error,
            })
          }
        }
      }
      setPositions(all.sort((a, b) => a.status.localeCompare(b.status)))
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(fetchData, 5000)
    return () => clearInterval(pollRef.current)
  }, [])

  const totalSol = balances.filter(b => b.chain === 'solana').reduce((s, b) => s + b.balance, 0)
  const totalBnb = balances.filter(b => b.chain === 'bsc').reduce((s, b) => s + b.balance, 0)

  return (
    <div className="max-w-[1400px] mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className={`flex items-center justify-between mb-6 lg:mb-8 ${isAr ? 'flex-row-reverse' : ''}`}>
        <div className={isAr ? 'text-right' : ''}>
          <h1 className="text-xl lg:text-2xl font-bold text-white">{t('dashboard')}</h1>
          <p className="text-sm text-[#6B7D9E] mt-1">{t('portfolio_overview')}</p>
        </div>
        <div className={`hidden sm:flex items-center gap-2 text-xs text-[#6B7D9E] bg-[#1A1400] border border-[#2A2000] rounded-xl px-3 py-2 ${isAr ? 'flex-row-reverse' : ''}`}>
          <Activity size={14} />
          <span>{t('auto_refresh')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard icon={Wallet} label={t('total_wallets')} value={balances.length} accent="bg-blue-500/10 text-blue-400" />
        <StatCard icon={TrendingUp} label={t('solana_balance')} value={`${totalSol.toFixed(4)}`} sub={`${balances.filter(b => b.chain === 'solana').length}`} accent="bg-[#FFD600]/10 text-[#FFD600]" />
        <StatCard icon={TrendingUp} label={t('bnb_balance')} value={`${totalBnb.toFixed(4)}`} sub={`${balances.filter(b => b.chain === 'bsc').length}`} accent="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={Repeat} label={t('open_positions')} value={positions.length} sub={positions.length > 0 ? `${positions.filter(p => p.status === 'monitoring').length} ${t('monitoring')}` : t('no_positions')} accent="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="bg-[#1A1400] rounded-[16px] border border-[#2A2000] p-4 lg:p-6 mb-6">
        <div className={`flex items-center justify-between mb-5 ${isAr ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-base lg:text-lg font-semibold text-white flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
            <Activity size={18} className="text-[#FFD600]" />
            {t('open_positions')}
            {positions.length > 0 && (
              <span className="text-xs font-normal text-[#6B7D9E] bg-[#2A2000] rounded-full px-2 py-0.5">
                {positions.length}
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center py-12 text-[#6B7D9E] ${isAr ? 'flex-row-reverse' : ''}`}>
            <Loader size={20} className="animate-spin mr-2" />
            <span className="text-sm">{t('loading')}</span>
          </div>
        ) : positions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
            {positions.map(pos => (
              <PositionCard key={`${pos.source}-${pos.id}`} pos={pos} t={t} isAr={isAr} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[#6B7D9E]">
            <Activity size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('no_positions')}</p>
            <p className="text-xs mt-1">{t('start_trading')}</p>
          </div>
        )}
      </div>

      <div className="bg-[#1A1400] rounded-[16px] border border-[#2A2000] p-4 lg:p-6">
        <button onClick={() => setShowBalances(!showBalances)}
          className={`w-full flex items-center justify-between mb-5 ${isAr ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-base lg:text-lg font-semibold text-white flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
            <Wallet size={18} className="text-[#FFD600]" />
            {t('wallet_balances')}
          </h2>
          {showBalances ? <ChevronUp size={18} className="text-[#6B7D9E]" /> : <ChevronDown size={18} className="text-[#6B7D9E]" />}
        </button>
        {showBalances && (
          loading ? (
            <div className={`flex items-center justify-center py-8 text-[#6B7D9E] ${isAr ? 'flex-row-reverse' : ''}`}>
              <Loader size={16} className="animate-spin mr-2" />
              <span className="text-sm">{t('loading')}</span>
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-8 text-[#6B7D9E]">
              <p className="text-sm">{t('no_wallets')}</p>
              <p className="text-xs mt-1">{t('create_wallet')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 lg:-mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-[#6B7D9E] border-b border-[#2A2000] ${isAr ? 'text-right' : 'text-left'}`}>
                    <th className="py-3 px-4 lg:px-6 font-medium">{t('label')}</th>
                    <th className="py-3 px-4 lg:px-6 font-medium">{t('chain')}</th>
                    <th className="py-3 px-4 lg:px-6 font-medium hidden md:table-cell">{t('address')}</th>
                    <th className={`py-3 px-4 lg:px-6 font-medium ${isAr ? 'text-left' : 'text-right'}`}>{t('balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b, i) => (
                    <tr key={i} className="border-b border-[#2A2000]/50 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 lg:px-6 font-medium text-gray-200">{b.label}</td>
                      <td className="py-3.5 px-4 lg:px-6">
                        <span className={`text-[11px] px-2 py-1 rounded-md font-medium border ${
                          b.chain === 'solana'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {b.chain}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 lg:px-6 text-[#6B7D9E] font-mono text-xs hidden md:table-cell">
                        {b.address?.slice(0, 8)}...{b.address?.slice(-6)}
                      </td>
                      <td className={`py-3.5 px-4 lg:px-6 font-mono text-gray-200 ${isAr ? 'text-left' : 'text-right'}`}>
                        {b.balance?.toFixed(6)} <span className="text-[#6B7D9E]">{b.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
