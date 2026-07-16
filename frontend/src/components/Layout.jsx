import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot, MessageSquare, LayoutDashboard, Repeat, Layers, TrendingUp,
  Wallet, LogOut, LogIn, Menu, X, ChevronLeft, User, KeyRound, Globe,
} from 'lucide-react'

export default function Layout({ onLogout, role }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const isAdmin = role === 'admin'
  const isAr = i18n.language === 'ar'
  const token = localStorage.getItem('token')

  const closeMobile = () => setOpen(false)

  const switchLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('lang', lng)
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lng
    setLangOpen(false)
  }

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <div className={`flex h-screen bg-surface text-gray-100 ${isAr ? 'rtl' : 'ltr'}`}>
      {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={closeMobile} />}

      <aside className={`fixed inset-y-0 ${isAr ? 'right-0' : 'left-0'} z-50 flex flex-col bg-[#110D00] border-${isAr ? 'l' : 'r'} border-[#2A2000] transition-all duration-300 ease-in-out ${open ? 'translate-x-0' : isAr ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0 lg:z-30 ${collapsed ? 'w-[70px]' : 'w-[240px]'}`}>
        <div className={`flex items-center h-14 px-3 border-b border-[#2A2000] shrink-0 ${isAr ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2.5 flex-1 cursor-pointer ${collapsed ? 'justify-center' : ''} ${isAr ? 'flex-row-reverse' : ''}`} onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-[#3D3200]">
              <Bot size={18} className="text-[#FFD600]" />
            </div>
            {!collapsed && (
              <div className={isAr ? 'text-right' : ''}>
                <h1 className="text-sm font-bold text-white leading-tight"><span className="text-[#FFD600]">InfoDash</span>Dog</h1>
                <p className="text-[9px] text-text-muted leading-tight">{t('ai_intelligence')}</p>
              </div>
            )}
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-200 p-1" onClick={closeMobile}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
          <NavLink to="/chat" onClick={closeMobile}
            className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''} ${isActive ? 'bg-[#FFD600]/10 text-[#FFD600] font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}
            title={collapsed ? t('ai_chat') : undefined}>
            <MessageSquare size={17} className="shrink-0" />
            {!collapsed && <span>{t('ai_chat')}</span>}
          </NavLink>

          {token && (
            <NavLink to="/dashboard" onClick={closeMobile}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''} ${isActive ? 'bg-[#FFD600]/10 text-[#FFD600] font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}
              title={collapsed ? t('dashboard') : undefined}>
              <LayoutDashboard size={17} className="shrink-0" />
              {!collapsed && <span>{t('dashboard')}</span>}
            </NavLink>
          )}

          {isAdmin && (
            <>
              <div className={`text-[9px] font-medium text-gray-600 uppercase tracking-wider px-3 pt-3 pb-1 ${collapsed ? 'text-center' : ''} ${isAr ? 'text-right' : ''}`}>
                {collapsed ? '' : t('trading')}
              </div>
              {[
                { to: '/volume', label: t('volume_bot'), icon: Repeat },
                { to: '/market-maker', label: t('market_maker'), icon: Layers },
                { to: '/exchange', label: t('exchange_bot'), icon: TrendingUp },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={closeMobile}
                  className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''} ${isActive ? 'bg-[#FFD600]/10 text-[#FFD600] font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}
                  title={collapsed ? label : undefined}>
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
              <div className={`text-[9px] font-medium text-gray-600 uppercase tracking-wider px-3 pt-3 pb-1 ${collapsed ? 'text-center' : ''} ${isAr ? 'text-right' : ''}`}>
                {collapsed ? '' : t('admin')}
              </div>
              {[
                { to: '/wallets', label: t('wallets'), icon: Wallet },
                { to: '/admin', label: t('admin_panel'), icon: User },
                { to: '/change-password', label: t('change_password'), icon: KeyRound },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={closeMobile}
                  className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''} ${isActive ? 'bg-[#FFD600]/10 text-[#FFD600] font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}
                  title={collapsed ? label : undefined}>
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className={`px-1.5 py-2 border-t border-[#2A2000] space-y-1`}>
          <div className="relative">
            <button onClick={() => setLangOpen(!langOpen)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-gray-400 hover:text-gray-200 hover:bg-gray-800 ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''}`}>
              <Globe size={18} className="shrink-0" />
              {!collapsed && <span className="text-xs">{i18n.language === 'ar' ? 'العربية' : 'English'}</span>}
            </button>
            {langOpen && !collapsed && (
              <div className={`absolute bottom-full mb-1 ${isAr ? 'right-0' : 'left-0'} w-36 bg-[#1A1400] border border-[#3D3200] rounded-lg shadow-lg overflow-hidden z-50`}>
                <button onClick={() => switchLang('ar')} className={`w-full px-3 py-2 text-sm text-left hover:bg-[#FFD600]/10 transition-colors ${i18n.language === 'ar' ? 'text-[#FFD600]' : 'text-gray-400'} ${isAr ? 'text-right' : ''}`}>
                  {t('arabic')}
                </button>
                <button onClick={() => switchLang('en')} className={`w-full px-3 py-2 text-sm text-left hover:bg-[#FFD600]/10 transition-colors ${i18n.language === 'en' ? 'text-[#FFD600]' : 'text-gray-400'} ${isAr ? 'text-right' : ''}`}>
                  {t('english')}
                </button>
              </div>
            )}
          </div>

          {token ? (
            <button onClick={() => { onLogout(); closeMobile() }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''} text-gray-500 hover:text-red-400 hover:bg-gray-800`}
              title={collapsed ? t('logout') : undefined}>
              <LogOut size={18} className="shrink-0" />
              {!collapsed && <span>{t('logout')}</span>}
            </button>
          ) : (
            <NavLink to="/login" onClick={closeMobile}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full ${collapsed ? 'justify-center px-0' : ''} ${isAr ? 'flex-row-reverse' : ''} text-gray-500 hover:text-[#FFD600] hover:bg-gray-800`}
              title={collapsed ? t('login') : undefined}>
              <LogIn size={18} className="shrink-0" />
              {!collapsed && <span>{t('login')}</span>}
            </NavLink>
          )}
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className={`hidden lg:flex items-center justify-center h-8 border-t border-[#2A2000] text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors`}>
          <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? (isAr ? '' : 'rotate-180') : (isAr ? 'rotate-180' : '')}`} />
        </button>
      </aside>

      <main className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out pt-12 lg:pt-0 ${isAr ? (collapsed ? 'lg:mr-[70px]' : 'lg:mr-[240px]') : (collapsed ? 'lg:ml-[70px]' : 'lg:ml-[240px]')}`}>
        <button className={`fixed top-2.5 z-50 lg:hidden bg-gray-800 p-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors shadow-lg ${isAr ? 'right-2.5' : 'left-2.5'}`} onClick={() => setOpen(true)}>
          <Menu size={18} />
        </button>
        <Outlet />
      </main>
    </div>
  )
}
