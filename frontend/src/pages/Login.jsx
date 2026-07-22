import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BASE, register as apiRegister, getCaptcha, forgotPassword as apiForgotPassword } from '../api'

export default function Login({ onLogin }) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const [mode, setMode] = useState('user')
  const [user, setUser] = useState('')
  const [userPass, setUserPass] = useState('')
  const [regUser, setRegUser] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const lastUser = localStorage.getItem('username')

  useEffect(() => {
    if (mode === 'register') fetchCaptcha()
  }, [mode])

  const fetchCaptcha = async () => {
    try {
      const d = await getCaptcha()
      setCaptcha(d)
      setCaptchaAnswer('')
    } catch { setCaptcha(null) }
  }

  const handleUserLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/api/login/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: userPass }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(err.detail || 'Login failed')
      }
      const data = await res.json()
      localStorage.setItem('role', data.role || 'regular')
      localStorage.setItem('username', data.username)
      onLogin(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!captcha) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const data = await apiRegister(regUser, regPass, regEmail, captcha.id, parseInt(captchaAnswer))
      setSuccess(data.message || 'Registered!')
      setRegUser('')
      setRegPass('')
    } catch (err) {
      setError(err.message)
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const tabClass = (tab) =>
    `flex-1 py-2 text-sm font-medium transition-colors ${mode === tab ? 'bg-[#FFD600] text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setForgotSent(false)
    try {
      await apiForgotPassword(forgotEmail)
      setForgotSent(true)
      setForgotEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); setShowForgot(false) }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-full max-w-sm">
        <div className={`text-center mb-6 ${isAr ? 'text-right' : 'text-left'} flex flex-col items-center`}>
          <div className="w-12 h-12 rounded-xl bg-[#FFD600]/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-[#FFD600] font-bold text-lg">ID</span>
          </div>
          <h1 className="text-2xl font-bold text-[#FFD600]">ghostRbot</h1>
          <p className="text-gray-500 text-sm mt-1">{t('tagline')}</p>
          {lastUser && mode !== 'register' && (
            <p className="text-gray-400 text-xs mt-2">{t('welcome_back')}, <span className="text-[#FFD600]">{lastUser}</span></p>
          )}
          <a href="/admin" className={`text-xs text-gray-500 hover:text-[#FFD600] mt-2 block transition-colors ${isAr ? 'text-left' : 'text-right'}`}>{t('admin_login')} ←</a>
        </div>

        <div className="flex mb-6 border border-gray-700 rounded-lg overflow-hidden">
          <button onClick={() => switchMode('user')} className={tabClass('user')}>{t('login')}</button>
          <button onClick={() => switchMode('register')} className={tabClass('register')}>{t('register')}</button>
        </div>

        {mode === 'user' && (
          <form onSubmit={handleUserLogin} className="space-y-4">
            <p className="text-xs text-gray-500 -mb-2">VIP / approved users</p>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('username')}</label>
              <input type="text" value={user}
                     onChange={e => setUser(e.target.value)}
                     className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                     placeholder={t('username')} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('password')}</label>
              <input type="password" value={userPass}
                     onChange={e => setUserPass(e.target.value)}
                     className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                     placeholder={t('password')} />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
            <button type="submit" disabled={loading}
                    className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-black font-medium py-2.5 rounded-lg transition-colors">
              {loading ? t('connecting') : t('login')}
            </button>
            <button type="button" onClick={() => { setShowForgot(!showForgot); setError(''); setForgotSent(false) }}
                    className="text-xs text-gray-500 hover:text-[#FFD600] mt-2 block text-center w-full transition-colors">
              {t('forgot_password')}
            </button>
          </form>
        )}

        {showForgot && (
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">{t('reset_password')}</h3>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('email')}</label>
              <input type="email" value={forgotEmail}
                     onChange={e => setForgotEmail(e.target.value)}
                     className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                     placeholder={t('email')} required />
            </div>
            {forgotSent && <div className="bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-lg p-3"><p className="text-[#FFD600] text-sm">{t('sending')}</p></div>}
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
            <button type="submit" disabled={loading}
                    className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-black font-medium py-2.5 rounded-lg transition-colors">
              {loading ? t('sending') : t('send_reset_link')}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-xs text-gray-500 -mb-2">{t('create_account')}</p>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('username')}</label>
              <input type="text" value={regUser}
                     onChange={e => setRegUser(e.target.value)}
                     className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                     placeholder={t('username')} autoFocus />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('email')}</label>
              <input type="email" value={regEmail}
                     onChange={e => setRegEmail(e.target.value)}
                     className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                     placeholder={t('email')} required />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('password')}</label>
              <input type="password" value={regPass}
                     onChange={e => setRegPass(e.target.value)}
                     className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                     placeholder={t('password_min')} />
            </div>
            {captcha && (
              <div>
                <label className="text-sm text-gray-400 block mb-1">{captcha.question}</label>
                <input type="number" value={captchaAnswer}
                       onChange={e => setCaptchaAnswer(e.target.value)}
                       className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD600] transition-colors ${isAr ? 'text-right' : ''}`}
                       placeholder={captcha.question} />
              </div>
            )}
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
            {success && <div className="bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-lg p-3"><p className="text-[#FFD600] text-sm">{success}</p></div>}
            <button type="submit" disabled={loading || !captcha}
                    className="w-full bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-50 text-black font-medium py-2.5 rounded-lg transition-colors">
              {loading ? t('registering') : t('register')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
