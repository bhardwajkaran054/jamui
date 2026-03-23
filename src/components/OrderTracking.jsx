import { useState, useEffect } from 'react'
import { Search, Package, Clock, CheckCircle2, XCircle, ChevronRight, User, Phone, ShoppingBag } from 'lucide-react'
import { apiFetch } from '../api'

export default function OrderTracking({ initialOrderId, onClose }) {
  const [searchQuery, setSearchQuery] = useState(initialOrderId || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [customerStats, setCustomerStats] = useState(null)

  useEffect(() => {
    if (initialOrderId) {
      handleSearch(initialOrderId)
    }
  }, [])

  useEffect(() => {
    if (!order || order.status !== 'completed' || !order.approvalTimestamp || !order.deliveryHours) return

    const updateTimer = () => {
      const approvalDate = new Date(order.approvalTimestamp)
      const deliveryDate = new Date(approvalDate.getTime() + order.deliveryHours * 60 * 60 * 1000)
      const now = new Date()
      const diff = deliveryDate - now

      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${h}h ${m}m ${s}s`)
      } else {
        setTimeLeft('Delivered')
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [order])

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setError('')
    setOrder(null)
    setCustomerStats(null)

    try {
      // Extract numeric ID from query (e.g., "JM-123456" -> 123456 or raw number)
      let numericId = query.replace(/[^0-9]/g, '')
      if (!numericId) {
        setError('Please enter a valid Order ID')
        setLoading(false)
        return
      }

      const result = await apiFetch(`/track/${numericId}`)
      setOrder(result)
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('not found')) {
        setError('Order not found. Please check your Order ID.')
      } else {
        setError('Failed to fetch order. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-100'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-100'
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-100'
      default: return 'text-gray-600 bg-gray-50 border-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5" />
      case 'rejected': return <XCircle className="w-5 h-5" />
      case 'pending': return <Clock className="w-5 h-5" />
      default: return <Package className="w-5 h-5" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in duration-300">

        {/* Header */}
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Track Your Order</h2>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Real-time status updates</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-90"
          >
            <XCircle className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Order ID (e.g. JM-123456)"
              className="w-full bg-gray-50 border-2 border-transparent focus:border-green-600 focus:bg-white rounded-[1.5rem] pl-14 pr-32 py-4 font-bold text-gray-900 transition-all outline-none shadow-sm"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-green-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Results Area */}
          <div className="space-y-6">
            {!searched && (
              <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-400 font-bold">Search using your Order ID</p>
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-green-600/20 border-t-green-600 rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] border border-red-100 flex items-center gap-4 animate-in slide-in-from-top-4">
                <XCircle className="w-6 h-6" />
                <p className="font-bold">{error}</p>
              </div>
            )}

            {order && (
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all overflow-hidden relative">
                {/* Status Ribbon */}
                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest border-b border-l ${getStatusColor(order.status)}`}>
                  {order.status}
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Order ID</p>
                        <h4 className="text-lg font-black text-gray-900">#JM-{order.id.toString().slice(-6)}</h4>
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {order.status === 'completed' && timeLeft && (
                        <div className="bg-green-50/50 p-4 rounded-[1.5rem] border border-green-100 animate-pulse">
                          <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Estimated Arrival
                          </p>
                          <p className="text-xl font-black text-green-700 font-mono tracking-tighter">{timeLeft}</p>
                        </div>
                      )}

                      {order.driver && (
                        <div className="bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100">
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> Delivery Boy
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-gray-800">{order.driver.name}</p>
                            <a href={`tel:${order.driver.phone}`} className="text-[10px] font-black text-blue-600 hover:underline">{order.driver.phone}</a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50/50 p-3 rounded-xl">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> Customer
                        </p>
                        <p className="text-xs font-bold text-gray-700 truncate">{order.customer?.name || 'Guest'}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-xl">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Date
                        </p>
                        <p className="text-xs font-bold text-gray-700">{new Date(order.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-48 flex flex-col justify-between items-end gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Bill</p>
                      <p className="text-2xl font-black text-green-600">₹{order.total}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </div>
                </div>

                {/* Status Details */}
                {(order.deliveryMessage || order.rejectionReason) && (
                  <div className={`mt-4 p-4 rounded-2xl border ${order.status === 'completed' ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-red-50/50 border-red-100 text-red-700'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${order.status === 'completed' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                        {order.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">
                          {order.status === 'completed' ? 'Delivery Update' : 'Rejection Reason'}
                        </p>
                        <p className="text-sm font-bold leading-tight">
                          {order.status === 'completed' ? order.deliveryMessage : order.rejectionReason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Preview */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="bg-gray-50 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 flex items-center gap-2">
                      <span>{item.emoji}</span>
                      <span>{item.name} x{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400">
                      +{order.items.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Phone className="w-4 h-4" />
            <span className="text-xs font-bold">Support: +91 78560 53987</span>
          </div>
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Jamui Super Mart v4.0</p>
        </div>
      </div>
    </div>
  )
}
