import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BASE } from '../api'

export default function AdminLogin({ onLogin }) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(err.detail || 'Login failed')
      }
      const data = await res.json()
      localStorage.setItem('role', data.role || 'admin')
      localStorage.setItem('username', data.username || 'admin')
      onLogin(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#FFD600]/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-[#FFD600] font-bold text-lg">ID</span>
          </div>
          <h1 className="text-2xl font-bold text-[#FFD600]">InfoDashDog</h1>
          <p className="text-gray-500 text-sm mt-1">{t('admin_panel')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('admin_password')}</label>
            <input type="password" value={password}
                   onChange={e => setPassword(e.target.value)}
                   className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                   placeholder={t('admin_password')} autoFocus />
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
          <button type="submit" disabled={loading}
                  className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-black font-medium py-2.5 rounded-lg transition-colors">
            {loading ? t('connecting') : t('admin_login')}
          </button>
        </form>
      </div>
    </div>
  )
}
