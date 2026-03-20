import { useState, useEffect } from 'react'
import { Search, X, Package, Clock, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Bell, MessageSquare, ChevronRight } from 'lucide-react'

export default function OrderTracking({ orders, onClose, onRefresh }) {
  const [orderId, setOrderId] = useState('')
  const [trackedOrder, setTrackedOrder] = useState(null)
  const [error, setError] = useState('')
  const [isNewOrder, setIsNewOrder] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchMode, setSearchMode] = useState('id') // 'id' or 'phone'
  const [searchPhone, setSearchPhone] = useState('')
  const [foundOrders, setFoundOrders] = useState([])

  useEffect(() => {
    const savedId = localStorage.getItem('latestOrderId')
    if (savedId && orders.length > 0) {
      const cleanSavedId = savedId.toString()
      setOrderId(`JM-${cleanSavedId.slice(-6)}`)
      
      // Try exact match first, then endsWith match
      const found = orders.find(o => 
        o.id.toString() === cleanSavedId || 
        o.id.toString().endsWith(cleanSavedId.slice(-6))
      )
      
      if (found) {
        setTrackedOrder(found)
        setError('')
        // Check if this order was placed in the last 10 seconds
        const orderTime = new Date(found.timestamp).getTime()
        const now = new Date().getTime()
        if (now - orderTime < 10000) {
          setIsNewOrder(true)
        }
      }
    }
  }, [orders])

  // Live Status Polling
  useEffect(() => {
    if (!trackedOrder || trackedOrder.status === 'completed') return

    const pollInterval = setInterval(() => {
      onRefresh()
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(pollInterval)
  }, [trackedOrder, onRefresh])

  // Status Change Detection & Notifications
  useEffect(() => {
    if (!trackedOrder) return

    const currentOrder = orders.find(o => o.id.toString() === trackedOrder.id.toString())
    if (currentOrder && currentOrder.status !== trackedOrder.status) {
      // Status has changed!
      setTrackedOrder(currentOrder)
      
      if (currentOrder.status === 'completed') {
        // Trigger Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Jamui Super Mart', {
            body: `Your order #JM-${currentOrder.id.toString().slice(-6)} has been confirmed!`,
            icon: '/favicon.svg'
          })
        }
        
        // Haptic for mobile
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 500])
        }

        // Play sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
        audio.play().catch(() => {})
      }
    }
  }, [orders, trackedOrder])

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleTrack = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setTrackedOrder(null)
    setIsNewOrder(false)
    setSearching(true)

    // Format input to match ID structure (extract numbers if JM- prefix used)
    const cleanId = orderId.toUpperCase().replace('JM-', '').trim()
    
    if (!cleanId) {
      setError('Please enter an Order ID.')
      setSearching(false)
      return
    }
    
    // Try local search first
    let found = orders.find(o => 
      o.id.toString() === cleanId || 
      o.id.toString().endsWith(cleanId)
    )
    
    // If not found locally, refresh orders once (maybe it's a very new order not yet synced)
    if (!found) {
      await onRefresh()
      // Search again in updated orders
      // We use a local variable to search in the updated orders which would be passed in next render, 
      // but for immediate feedback we can wait for the parent to re-render or use the fact that handleTrack 
      // might be called again. However, since we're in an async function, orders might still be old.
      // Better: App.jsx should return the fetched orders from onRefresh or we wait.
    }

    // Since we can't easily get the *new* orders from onRefresh (it doesn't return them),
    // we rely on the next render's useEffect or just check if it's there now.
    found = orders.find(o => 
      o.id.toString() === cleanId || 
      o.id.toString().endsWith(cleanId)
    )

    if (found) {
      setTrackedOrder(found)
    } else {
      setError('Order not found. Please check your Order ID or wait a moment for sync.')
    }
    setSearching(false)
  }

  const handlePhoneSearch = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setFoundOrders([])
    setSearching(true)

    if (!searchPhone || searchPhone.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp number.')
      setSearching(false)
      return
    }

    // Refresh orders to get latest history
    await onRefresh()

    const cleanPhone = searchPhone.replace(/\D/g, '').slice(-10)
    const matches = orders.filter(o => 
      o.customer?.phone?.replace(/\D/g, '').endsWith(cleanPhone)
    )

    if (matches.length > 0) {
      setFoundOrders(matches)
    } else {
      setError('No orders found for this number.')
    }
    setSearching(false)
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
      
      <div className="relative w-full h-full sm:h-[90vh] sm:max-h-[850px] max-w-lg bg-white rounded-none sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Track Your Order</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500 font-medium">Live Status & History</p>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Live</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all group">
            <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-8">
          {/* Search Mode Toggles */}
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button 
              onClick={() => { setSearchMode('id'); setError(''); setFoundOrders([]); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                searchMode === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Order Tracking
            </button>
            <button 
              onClick={() => { setSearchMode('phone'); setError(''); setTrackedOrder(null); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                searchMode === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              My Order History
            </button>
          </div>

          {isNewOrder && searchMode === 'id' && (
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

          {searchMode === 'id' ? (
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
                disabled={searching}
                className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {searching ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : (
                  trackedOrder ? 'Check Another Order' : 'Check Status'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSearch} className="space-y-4">
              <div className="relative group">
                <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                <input 
                  type="tel"
                  placeholder="WhatsApp Number (e.g. 78560...)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] pl-14 pr-6 py-5 text-lg font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-100 focus:bg-white transition-all uppercase placeholder:normal-case placeholder:font-medium"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={searching}
                className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-100 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {searching ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading History...</span>
                  </div>
                ) : (
                  'Find My Orders'
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-red-100 p-3 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-red-700 font-black text-sm">{error}</p>
                <p className="text-red-400 text-[10px] font-bold uppercase mt-1 tracking-widest">Double check JM- prefix</p>
              </div>
            </div>
          )}

          {/* Notification Permission Request */}
          {'Notification' in window && Notification.permission === 'default' && (
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-900">Get Live Alerts</h4>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Enable for order updates</p>
                </div>
              </div>
              <button 
                onClick={() => Notification.requestPermission()}
                className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
              >
                Enable
              </button>
            </div>
          )}

          {trackedOrder && searchMode === 'id' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              {/* Enhanced Order Status Timeline */}
              <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6 text-center">Order Journey</p>
                <div className="flex justify-between items-start relative">
                  {/* Progress Bar Background */}
                  <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-10" />
                  <div className={`absolute top-5 left-0 h-1 bg-green-600 transition-all duration-1000 -z-10 ${
                    trackedOrder.status === 'completed' ? 'w-full' : 'w-0'
                  }`} />

                  <div className="flex flex-col items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      trackedOrder.status === 'pending' || trackedOrder.status === 'completed' 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-100 ring-4 ring-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        trackedOrder.status === 'pending' || trackedOrder.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`}>Received</p>
                      <p className="text-[8px] text-gray-400 font-bold mt-0.5">{new Date(trackedOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      trackedOrder.status === 'completed' 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-100 ring-4 ring-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${
                        trackedOrder.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`}>Confirmed</p>
                      {trackedOrder.status === 'completed' && (
                        <p className="text-[8px] text-green-500 font-bold mt-0.5">Success</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center justify-between p-6 rounded-[2.5rem] border transition-all ${
                trackedOrder.status === 'completed' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'
              }`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    trackedOrder.status === 'completed' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {trackedOrder.status === 'completed' ? 'Order Status' : 'Next Step'}
                  </p>
                  <div className="flex items-center gap-2">
                    {trackedOrder.status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-orange-500 animate-pulse" />
                    )}
                    <span className={`text-2xl font-black uppercase tracking-tight ${
                      trackedOrder.status === 'completed' ? 'text-green-700' : 'text-orange-600'
                    }`}>
                      {trackedOrder.status === 'completed' ? 'Confirmed' : 'Order Received'}
                    </span>
                    {trackedOrder.estimatedDelivery && (
                      <div className="ml-2 flex flex-col bg-white/50 px-3 py-1 rounded-xl border border-green-100">
                        <span className="text-[8px] font-black text-green-600 uppercase tracking-widest leading-none">EST. DELIVERY</span>
                        <span className="text-xs font-black text-gray-700 leading-none">{trackedOrder.estimatedDelivery}</span>
                      </div>
                    )}
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="ml-2 p-2 hover:bg-white/50 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                      title="Refresh Status"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {trackedOrder.status !== 'completed' && (
                    <p className="text-[10px] text-orange-500 font-bold mt-2 uppercase tracking-wider flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-orange-500 rounded-full animate-ping" />
                      Will confirm once accepted by store
                    </p>
                  )}
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

          {foundOrders.length > 0 && searchMode === 'phone' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 overflow-y-visible pr-2">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  Order History
                </p>
                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {foundOrders.length} {foundOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <div className="grid gap-4">
                {foundOrders.map((order) => (
                  <button 
                    key={order.id}
                    onClick={() => {
                      setTrackedOrder(order);
                      setSearchMode('id');
                      setOrderId(`JM-${order.id.toString().slice(-6)}`);
                    }}
                    className="w-full bg-white border border-gray-100 p-5 rounded-[2rem] flex items-center justify-between hover:border-green-200 hover:shadow-xl transition-all text-left group relative overflow-hidden"
                  >
                    {/* Status indicator line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`} />
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {order.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-gray-900">#JM-{order.id.toString().slice(-6)}</h4>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {new Date(order.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total</p>
                        <p className="text-lg font-black text-gray-900 leading-none">₹{order.total}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Fixed at bottom */}
        <div className="p-6 bg-gray-50/80 backdrop-blur-md border-t border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
            <span>Secured by Jamui Super Mart</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <button 
              onClick={() => window.open('https://wa.me/917856053987', '_blank')}
              className="text-green-600 hover:underline"
            >
              Contact Support
            </button>
          </div>
          <button 
            onClick={onClose}
            className="w-full sm:hidden bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  )
}
