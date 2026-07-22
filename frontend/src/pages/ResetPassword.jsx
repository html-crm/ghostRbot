import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword as apiResetPassword } from '../api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await apiResetPassword(token, password)
      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Invalid Link</h1>
          <p className="text-gray-400 text-sm">This password reset link is invalid or expired.</p>
          <a href="/login" className="text-[#FFD600] text-sm mt-4 block hover:underline">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="https://i.ibb.co/XZ8JJ6vp/Chat-GPT-Image-Jun-25-2026-09-13-45-PM.png" alt="ghostRbot" className="w-12 h-12 rounded-xl mx-auto mb-3 object-cover" />
          <h1 className="text-2xl font-bold text-[#FFD600]">Reset Password</h1>
        </div>
        {success ? (
          <div className="bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-lg p-4 text-center">
            <p className="text-[#FFD600] text-sm">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">New Password</label>
              <input type="password" value={password}
                     onChange={e => setPassword(e.target.value)}
                     className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors"
                     placeholder="Min 6 characters" required />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Confirm Password</label>
              <input type="password" value={confirm}
                     onChange={e => setConfirm(e.target.value)}
                     className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors"
                     placeholder="Repeat password" required />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
            <button type="submit" disabled={loading}
                    className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}