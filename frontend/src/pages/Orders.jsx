import { useState, useEffect } from 'react'
import { getOrders, cancelOrder, createOrder } from '../api'
import { FileSpreadsheet, Plus, Trash2 } from 'lucide-react'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [chain, setChain] = useState('solana')
  const [token, setToken] = useState('')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [type, setType] = useState('take_profit')

  const fetchOrders = () => getOrders().then(setOrders).catch(console.error)
  useEffect(() => { fetchOrders() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    await createOrder(chain, token, parseFloat(amount), parseFloat(price), type)
    setShowForm(false)
    setToken('')
    setAmount('')
    setPrice('')
    fetchOrders()
  }

  const handleCancel = async (id) => {
    await cancelOrder(id)
    fetchOrders()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="text-[#FFD600]" size={24} />
          <div>
            <h1 className="text-2xl font-bold">Limit Orders</h1>
            <p className="text-gray-500 text-sm">Take profit and stop loss</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#FFD600]/10 text-[#FFD600] hover:bg-[#FFD600]/20 border border-[#FFD600]/20 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Order
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <form onSubmit={handleCreate} className="space-y-4">
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
                <label className="text-sm text-gray-400 block mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]">
                  <option value="take_profit">Take Profit</option>
                  <option value="stop_loss">Stop Loss</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Token Address</label>
              <input type="text" value={token} onChange={(e) => setToken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#FFD600]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Amount (tokens)</label>
                <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Target Price ($)</label>
                <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600]" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-[#FFD600] hover:bg-[#E6C000] text-white font-medium py-2.5 rounded-lg transition-colors">
              Create Order
            </button>
          </form>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        {orders.filter((o) => !o.executed).length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No active limit orders</p>
        ) : (
          <div className="space-y-3">
            {orders.filter((o) => !o.executed).map((o) => (
              <div key={o.order_id} className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    o.order_type === 'take_profit' ? 'bg-[#FFD600]/10 text-[#FFD600]' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {o.order_type === 'take_profit' ? 'TP' : 'SL'}
                  </span>
                  <div>
                    <p className="text-sm font-mono">{o.token_address?.slice(0, 6)}...{o.token_address?.slice(-4)}</p>
                    <p className="text-xs text-gray-500">{o.amount} tokens @ ${o.target_price}</p>
                  </div>
                </div>
                <button onClick={() => handleCancel(o.order_id)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
