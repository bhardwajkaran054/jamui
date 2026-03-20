import { LogOut, ShieldCheck, LayoutDashboard } from 'lucide-react'

export default function Footer({ isAdmin, onLogout }) {
  return (
    <footer className="bg-green-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-black tracking-tight">🛒 Jamui Super Mart</h3>
            <p className="text-green-300/80 text-sm leading-relaxed max-w-xs">
              Bringing the freshest groceries from Jamui's local farms straight to your kitchen. Quality you can trust, prices you'll love.
            </p>
            <div className="pt-4">
              {isAdmin && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Admin Mode Active
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.location.hash = '#/admin'}
                      className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-2 rounded-lg w-fit"
                    >
                      <LayoutDashboard className="w-3 h-3" />
                      Open Dashboard
                    </button>
                    <button 
                      onClick={onLogout}
                      className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-2 rounded-lg w-fit"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-green-100 uppercase tracking-widest text-xs">Contact Support</h4>
            <div className="space-y-4 text-sm text-green-300/90">
              <div className="flex items-start gap-3">
                <span className="bg-green-800/50 p-2 rounded-lg text-lg">📲</span>
                <div>
                  <p className="font-bold text-green-100">WhatsApp</p>
                  <p>+91 6202989990</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-green-800/50 p-2 rounded-lg text-lg">📍</span>
                <div>
                  <p className="font-bold text-green-100">Location</p>
                  <p>Jamui, Bihar, India</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-800/30 p-8 rounded-3xl border border-green-700/30">
            <h4 className="font-bold mb-4 text-green-100">Fast Checkout</h4>
            <p className="text-sm text-green-300/80 mb-6">Skip the lines. Order on WhatsApp and pay on delivery.</p>
            <a
              href="https://wa.me/916202989990"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-orange-900/20 active:scale-95 w-full"
            >
              📲 ORDER NOW
            </a>
          </div>
        </div>
        
        <div className="border-t border-green-800/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-green-500/60 text-xs font-medium">
          <p>© {new Date().getFullYear()} Jamui Super Mart. Crafted for Quality.</p>
          <div className="flex gap-6">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Service Active</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
