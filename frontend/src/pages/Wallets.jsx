import { useState, useEffect } from 'react'
import { getWallets, getBalances, createWallet, importWallet, deleteWallet, BASE } from '../api'
import { Wallet, Plus, Trash2, Download, Pencil, Copy, RefreshCw } from 'lucide-react'

export default function Wallets() {
  const [wallets, setWallets] = useState([])
  const [balances, setBalances] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [chain, setChain] = useState('solana')
  const [label, setLabel] = useState('')
  const [pk, setPk] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchWallets = () => getWallets().then(setWallets).catch(console.error)
  const fetchBalances = () => getBalances().then(setBalances).catch(console.error)
  useEffect(() => { fetchWallets(); fetchBalances() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await createWallet(chain, label)
      setShowCreate(false)
      setLabel('')
      setSuccess('Wallet created')
      fetchWallets(); fetchBalances()
    } catch (e) { setError(e.message) }
  }

  const handleImport = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      await importWallet(chain, label, pk)
      setShowImport(false)
      setLabel('')
      setPk('')
      setSuccess('Wallet imported')
      fetchWallets(); fetchBalances()
    } catch (e) { setError(e.message) }
  }

  const handleDelete = async (lbl) => {
    if (!confirm(`Delete wallet '${lbl}'?`)) return
    await deleteWallet(lbl)
    fetchWallets(); fetchBalances()
  }

  const copyAddress = (addr) => navigator.clipboard.writeText(addr)

  const handleRename = async (oldLabel) => {
    if (!newLabel.trim()) return
    const token = localStorage.getItem('token')
    const res = await fetch(`${BASE}/api/wallets/${encodeURIComponent(oldLabel)}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_label: newLabel.trim() }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.detail || 'Rename failed')
    }
    setRenaming(null)
    setNewLabel('')
    fetchWallets()
  }

  const balanceMap = {}
  for (const b of balances) {
    balanceMap[b.label] = { balance: b.balance, unit: b.unit }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="text-[#FFD600]" size={24} />
          <div>
            <h1 className="text-2xl font-bold">Wallets</h1>
            <p className="text-gray-500 text-sm">Manage your trading wallets</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowCreate(true); setShowImport(false) }}
            className="flex items-center gap-2 bg-[#FFD600]/10 text-[#FFD600] hover:bg-[#FFD600]/20 border border-[#FFD600]/20 px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Create
          </button>
          <button onClick={() => { setShowImport(true); setShowCreate(false) }}
            className="flex items-center gap-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-2 rounded-lg transition-colors">
            <Download size={16} /> Import
          </button>
          <button onClick={fetchBalances}
            className="flex items-center gap-2 bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600 px-4 py-2 rounded-lg transition-colors" title="Refresh balances">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-2 text-sm">{error}</div>}
      {success && <div className="bg-[#E6C000]/30 border border-[#E6C000] text-[#FFD600] rounded-lg px-4 py-2 text-sm">{success}</div>}

      {(showCreate || showImport) && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <form onSubmit={showCreate ? handleCreate : handleImport} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Chain</label>
                <select value={chain} onChange={(e) => setChain(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]">
                  <option value="solana">Solana</option>
                  <option value="bsc">BSC</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]"
                  placeholder="main-wallet" />
              </div>
            </div>
            {showImport && (
              <div>
                <label className="text-sm text-gray-400 block mb-1">Private Key / Seed</label>
                <input type="password" value={pk} onChange={(e) => setPk(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#FFD600]" />
              </div>
            )}
            <button type="submit"
              className="w-full bg-[#FFD600] hover:bg-[#E6C000] text-white font-medium py-2.5 rounded-lg transition-colors">
              {showCreate ? 'Create Wallet' : 'Import Wallet'}
            </button>
          </form>
        </div>
      )}

      <div>
        {wallets.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-gray-500 text-sm text-center py-8">No wallets yet. Create or import one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...wallets].sort((a, b) => {
              const ba = balanceMap[a.label]?.balance ?? -1
              const bb = balanceMap[b.label]?.balance ?? -1
              return bb - ba
            }).map((w, i) => {
              const bal = balanceMap[w.label] || {}
              const isSol = w.chain === 'solana'
              return (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-[#FFD600]/30 transition-colors group relative">
                  <button onClick={() => handleDelete(w.label)}
                    className="absolute top-2 right-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>

                  <span className="text-2xl mb-2">{isSol ? '◎' : '🟡'}</span>

                  {renaming === w.label ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleRename(w.label) }} className="flex items-center gap-1 w-full mb-1">
                      <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-full text-center focus:outline-none focus:border-[#FFD600]"
                        autoFocus onBlur={() => { setRenaming(null); setNewLabel('') }} />
                      <button type="submit" className="text-[#FFD600] text-xs shrink-0">Save</button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-sm font-medium truncate max-w-[120px]">{w.label}</p>
                      <button onClick={() => { setRenaming(w.label); setNewLabel(w.label) }}
                        className="text-gray-600 hover:text-[#FFD600] transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}

                  <span className={`px-2 py-0.5 rounded text-xs mb-2 ${isSol ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {w.chain}
                  </span>

                  <div className="flex items-center gap-1 max-w-full mb-3">
                    <p className="text-xs font-mono text-gray-500 truncate">{w.address.slice(0, 6)}...{w.address.slice(-4)}</p>
                    <button onClick={() => copyAddress(w.address)} className="text-gray-600 hover:text-[#FFD600] shrink-0" title="Copy address">
                      <Copy size={10} />
                    </button>
                  </div>

                  <div className="mt-auto w-full pt-3 border-t border-gray-800">
                    <p className="text-lg font-bold text-white">{bal.balance != null ? bal.balance.toFixed(4) : '—'}</p>
                    <p className="text-xs text-gray-500">{bal.unit || '?'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
