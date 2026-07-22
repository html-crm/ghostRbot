import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BASE } from '../api'
import { Bot, Send, Loader, TrendingUp, Shield, Brain, Activity, Newspaper } from 'lucide-react'

export default function Chat() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef(null)
  const inputRef = useRef(null)

  const QUICK_COMMANDS = [
    { label: t('market_overview'), cmd: '/market', icon: TrendingUp },
    { label: t('btc_analysis'), cmd: '/btc', icon: TrendingUp },
    { label: t('latest_news'), cmd: '/news', icon: Newspaper },
    { label: t('whale_activity'), cmd: '/whales', icon: Activity },
    { label: t('sentiment'), cmd: '/sentiment', icon: Brain },
    { label: t('risk_check'), cmd: '/risk', icon: Shield },
  ]

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text.trim(), time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text.trim(), lang: i18n.language }),
      })
      const data = await res.json()
      const aiMsg = {
        role: 'assistant',
        content: data.response || data.detail || 'No response received.',
        time: new Date(),
        metadata: data.metadata || null,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${t('error')}: ${err.message}`,
        time: new Date(),
        isError: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-screen max-w-4xl mx-auto">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-black/30 border border-[#3D3200] flex items-center justify-center mb-6">
            <Bot size={32} className="text-[#FFD600]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ghostRbot AI</h1>
          <p className="text-text-secondary text-sm text-center max-w-md mb-8">
            {t('chat_welcome_desc')}
          </p>
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg w-full ${isAr ? 'text-right' : ''}`}>
            {QUICK_COMMANDS.map(({ label, cmd, icon: Icon }) => (
              <button key={cmd} onClick={() => sendMessage(cmd)}
                className={`flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 hover:border-[#FFD600]/30 hover:bg-[#FFD600]/5 transition-all group ${isAr ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <Icon size={16} className="text-text-secondary group-hover:text-[#FFD600] transition-colors shrink-0" />
                <span className="text-sm text-text-secondary group-hover:text-white transition-colors">{label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? (isAr ? 'justify-start' : 'justify-end') : (isAr ? 'justify-end' : 'justify-start')}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#FFD600]/15 border border-[#FFD600]/20 text-white'
                  : msg.isError
                    ? 'bg-red-900/30 border border-red-800/40 text-red-300'
                    : 'bg-card border border-border text-gray-200'
              } ${isAr ? 'text-right' : 'text-left'}`}>
                {msg.role === 'assistant' && (
                  <div className={`flex items-center gap-2 mb-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                    <Bot size={14} className="text-[#FFD600]" />
                    <span className="text-xs font-medium text-[#FFD600]">ghostRbot</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className="text-[10px] text-text-muted mt-2">
                  {msg.time.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className={`flex ${isAr ? 'justify-end' : 'justify-start'}`}>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className={`flex items-center gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <Bot size={14} className="text-[#FFD600]" />
                  <span className="text-xs font-medium text-[#FFD600]">ghostRbot</span>
                </div>
                <div className={`flex items-center gap-2 mt-2 ${isAr ? 'flex-row-reverse' : ''}`}>
                  <Loader size={14} className="text-[#FFD600 animate-spin" />
                  <span className="text-sm text-text-secondary">{t('analyzing')}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
      )}

      <div className="border-t border-border bg-surface px-4 py-3">
        <form onSubmit={handleSubmit} className={`flex items-center gap-3 max-w-4xl mx-auto ${isAr ? 'flex-row-reverse' : ''}`}>
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('chat_placeholder')}
            disabled={loading}
            className={`flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-[#FFD600]/40 transition-colors disabled:opacity-50 ${isAr ? 'text-right' : ''}`} />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-[#FFD600] hover:bg-[#E6C000] disabled:opacity-30 flex items-center justify-center transition-colors shrink-0">
            <Send size={16} className="text-black" />
          </button>
        </form>
      </div>
    </div>
  )
}
