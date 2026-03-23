import { motion } from 'framer-motion'
import { Bell, ShoppingCart, ShieldCheck, MapPin } from 'lucide-react'
import type { HeaderProps } from '../types'

export default function Header({ cartCount, onCartClick, onTrackClick, isAdmin, notice }: HeaderProps) {
  return (
    <div className="sticky top-0 z-40">
      {notice?.active && notice?.text && (
        <div className="bg-orange-500 text-white text-center py-2 px-4 font-black text-xs overflow-hidden relative border-b border-orange-600 shadow-sm">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '-100%' }}
            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
            className="whitespace-nowrap flex items-center gap-2"
          >
            <Bell className="w-3 h-3" /> {notice.text}
          </motion.div>
        </div>
      )}
      <header className="bg-white/80 backdrop-blur-md text-gray-900 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-xl shadow-lg shadow-green-200">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none mb-1">JAMUI SUPER MART</h1>
              <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Premium Grocery Services</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onTrackClick}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 sm:px-5 py-3 rounded-2xl transition-all active:scale-95 border border-gray-200"
            >
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="hidden xs:inline">Track Order</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => window.location.hash = '#/admin'}
                className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white px-5 py-3 rounded-2xl transition-all shadow-xl shadow-gray-200 active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </button>
            )}

            <button
              onClick={onCartClick}
              className="relative bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-green-200 active:scale-95 group"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">My Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}
