import { Lock, Send } from 'lucide-react'

const TELEGRAM_LINK = 'https://t.me/CryptoDigitalGate'

export default function Paywall({ feature }) {
  return (
    <div className="p-6 max-w-lg mx-auto mt-12">
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FFD600]/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-[#FFD600]" />
        </div>
        <h2 className="text-xl font-bold text-gray-200 mb-2">{feature}</h2>
        <p className="text-gray-500 text-sm mb-6">
          This feature requires a paid subscription.
        </p>
        <div className="bg-gray-800/50 rounded-xl p-5 mb-6">
          <p className="text-3xl font-bold text-[#FFD600]">$50</p>
          <p className="text-sm text-gray-400 mt-1">per month</p>
        </div>
        <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 bg-[#FFD600] hover:bg-[#E6C000] text-black font-medium px-6 py-3 rounded-lg transition-colors">
          <Send size={16} /> Contact Admin on Telegram
        </a>
        <p className="text-xs text-gray-600 mt-4">
          After payment, admin will upgrade your account to VIP.
        </p>
      </div>
    </div>
  )
}
