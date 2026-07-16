import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const switchLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('lang', lng)
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lng
  }

  const INTEL = [
    { icon: '📰', title: t('news_intelligence'), desc: t('news_intelligence_desc') },
    { icon: '🔍', title: t('narrative_detection'), desc: t('narrative_detection_desc') },
    { icon: '🛡', title: t('risk_security'), desc: t('risk_security_desc') },
    { icon: '📊', title: t('market_analysis'), desc: t('market_analysis_desc') },
    { icon: '🧠', title: t('sentiment_analysis'), desc: t('sentiment_analysis_desc') },
    { icon: '📈', title: t('etf_regulatory'), desc: t('etf_regulatory_desc') },
  ]

  const TOPICS = [
    'Bitcoin', 'Ethereum', 'Solana', 'DeFi', 'AI tokens',
    'Meme coins', 'ETFs', 'SEC', 'Whales', 'Narratives',
    'Sentiment', 'Scam alerts', 'Token unlocks', 'Hack alerts',
  ]

  return (
    <div className="min-h-screen bg-surface text-gray-100 relative" dir={isAr ? 'rtl' : 'ltr'}>
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className={`flex items-center gap-2.5 ${isAr ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-[#3D3200]">
              <span className="text-[#FFD600] font-bold text-sm">D</span>
            </div>
            <span className="text-sm font-bold tracking-tight"><span className="text-[#FFD600]">InfoDash</span>Dog</span>
          </div>
          <div className={`flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors">
                <Globe size={14} />
                <span>{i18n.language === 'ar' ? 'عربي' : 'EN'}</span>
              </button>
              <div className="absolute top-full mt-1 right-0 w-28 bg-surface border border-border rounded-lg shadow-xl overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                <button onClick={() => switchLang('ar')} className={`w-full px-3 py-2 text-sm hover:bg-[#FFD600]/10 transition-colors ${i18n.language === 'ar' ? 'text-[#FFD600]' : 'text-gray-400'} ${isAr ? 'text-right' : 'text-left'}`}>العربية</button>
                <button onClick={() => switchLang('en')} className={`w-full px-3 py-2 text-sm hover:bg-[#FFD600]/10 transition-colors ${i18n.language === 'en' ? 'text-[#FFD600]' : 'text-gray-400'} ${isAr ? 'text-right' : 'text-left'}`}>English</button>
              </div>
            </div>
            <button onClick={() => navigate('/chat')} className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border text-gray-300 hover:text-white hover:border-[#FFD600]/40 transition-colors">
              {t('ai_chat')}
            </button>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#FFD600]/20 bg-[#FFD600]/5 text-[10px] text-[#FFD600] font-medium mb-6">
          <span>{t('ai_intelligence')}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          <span className="text-[#FFD600]">InfoDash</span>Dog
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8 leading-relaxed">{t('tagline')}</p>
        <div className={`flex items-center justify-center gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => navigate('/chat')} className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#FFD600] text-black hover:bg-[#E6C000] transition-colors">
            {t('start_chatting')}
          </button>
          <button onClick={() => navigate('/chat')} className="px-6 py-3 rounded-xl text-sm font-medium border border-border text-gray-300 hover:text-white hover:border-[#FFD600]/40 transition-colors">
            {t('explore_features')}
          </button>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">{t('features_title')}</h2>
          <p className="text-text-secondary text-center text-sm mb-10 max-w-xl mx-auto">{t('tagline')}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTEL.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-[#FFD600]/20 transition-colors">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">{t('intelligence_topics')}</h2>
          <p className="text-text-secondary text-sm mb-6">{t('intelligence_topics_desc')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TOPICS.map((topic) => (
              <span key={topic} className="px-3 py-1.5 rounded-lg text-xs bg-card border border-border text-gray-300">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 border-t border-border">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">{t('start_chatting')}</h2>
          <p className="text-text-secondary text-sm mb-8">{t('start_chatting_desc')}</p>
          <button onClick={() => navigate('/chat')} className="px-8 py-3.5 rounded-xl text-sm font-semibold bg-[#FFD600] text-black hover:bg-[#E6C000] transition-colors">
            {t('launch_app')}
          </button>
          <p className="text-text-muted text-[10px] mt-3">{t('footer_text')}</p>
        </div>
      </section>

      <footer className="py-6 border-t border-border text-center text-text-muted text-[10px]">
        {t('footer_text')}
      </footer>
    </div>
  )
}
