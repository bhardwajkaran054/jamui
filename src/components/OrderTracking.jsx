import { useState, useEffect } from 'react'
import { Search, X, Package, Clock, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react'

export default function OrderTracking({ orders, onClose, onRefresh }) {
  const [orderId, setOrderId] = useState('')
  const [trackedOrder, setTrackedOrder] = useState(null)
  const [error, setError] = useState('')
  const [isNewOrder, setIsNewOrder] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const savedId = localStorage.getItem('latestOrderId')
    if (savedId) {
      setOrderId(`JM-${savedId.toString().slice(-6)}`)
      const found = orders.find(o => o.id.toString() === savedId.toString())
      if (found) {
        setTrackedOrder(found)
        setError('') // Clear error if found
        // Check if this order was placed in the last 10 seconds
        const orderTime = new Date(found.timestamp).getTime()
        const now = new Date().getTime()
        if (now - orderTime < 10000) {
          setIsNewOrder(true)
        }
      }
    }
  }, [orders])

  const handleTrack = (e) => {
    if (e) e.preventDefault()
    setError('')
    setTrackedOrder(null)
    setIsNewOrder(false)

    // Format input to match ID structure (extract numbers if JM- prefix used)
    const cleanId = orderId.replace('JM-', '').trim()
    
    const found = orders.find(o => o.id.toString().endsWith(cleanId))
    
    if (found) {
      setTrackedOrder(found)
    } else {
      setError('Order not found. Please check your Order ID.')
    }
  }

  const handleRefresh = async () => {
    if (!trackedOrder) return
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full h-full sm:h-auto max-w-lg bg-white rounded-none sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Track Your Order</h2>
            <p className="text-sm text-gray-500 font-medium">Enter your Order ID to see live status</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {isNewOrder && (
            <div className="bg-green-600 p-6 rounded-[2rem] text-white flex items-center gap-4 shadow-xl shadow-green-200 animate-in zoom-in-95 duration-500">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-lg leading-tight">Order Confirmed!</h3>
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-0.5">Your tracking is live</p>
              </div>
            </div>
          )}

          <form onSubmit={handleTrack} className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
              <input 
                type="text"
                placeholder="Order ID (e.g. JM-428643)"
                className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] pl-14 pr-6 py-5 text-lg font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-100 focus:bg-white transition-all uppercase placeholder:normal-case placeholder:font-medium"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
              {trackedOrder ? 'Check Another Order' : 'Check Status'}
            </button>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-red-100 p-3 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-700 font-black text-sm">{error}</p>
            </div>
          )}

          {trackedOrder && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between p-6 bg-green-50 rounded-[2.5rem] border border-green-100">
                <div>
                  <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Current Status</p>
                  <div className="flex items-center gap-2">
                    {trackedOrder.status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-orange-500 animate-pulse" />
                    )}
                    <span className={`text-2xl font-black uppercase tracking-tight ${
                      trackedOrder.status === 'completed' ? 'text-green-700' : 'text-orange-600'
                    }`}>
                      {trackedOrder.status}
                    </span>
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="ml-2 p-2 hover:bg-white/50 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                      title="Refresh Status"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Order Date</p>
                  <p className="font-black text-gray-700">{new Date(trackedOrder.timestamp).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-3 h-3" /> Order Details
                </p>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {trackedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.emoji}</span>
                        <span className="text-sm font-bold text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-gray-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-400 uppercase">Total Paid</span>
                  <span className="text-2xl font-black text-green-700">₹{trackedOrder.total}</span>
                </div>
              </div>

              <div className="text-center p-4">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
                  Need help? Contact support via WhatsApp<br/>
                  <span className="text-green-600">+91 78560 53987</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
