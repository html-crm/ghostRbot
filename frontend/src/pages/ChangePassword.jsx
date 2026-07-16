import { useState } from 'react'
import { BASE } from '../api'
import { KeyRound, Check, X } from 'lucide-react'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (newPass !== confirm) { setError('Passwords do not match'); return }
    if (newPass.length < 6) { setError('New password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/api/admin/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: current, new_password: newPass }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to change password')
      setSuccess(data.message || 'Password changed successfully')
      setCurrent(''); setNewPass(''); setConfirm('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <KeyRound className="w-6 h-6 text-[#FFD600]" /> Change Admin Password
      </h1>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-2"><X className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="mb-4 p-3 bg-[#FFD600]/10 border border-[#FFD600]/30 text-[#FFD600] rounded-lg flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Current Password</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors" required />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">New Password</label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors" required minLength={6} />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Confirm New Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors" required />
        </div>
        <button type="submit" disabled={loading}
                className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
          {loading ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
