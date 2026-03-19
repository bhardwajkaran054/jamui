import { useState, useEffect } from 'react'
import { 
  Package, 
  ClipboardList, 
  LogOut, 
  Trash2, 
  Edit3, 
  Plus, 
  Clock, 
  TrendingDown, 
  AlertTriangle, 
  BarChart3, 
  PieChart, 
  Activity, 
  ShoppingBag, 
  LayoutGrid, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Calendar,
  ChevronRight,
  User
} from 'lucide-react'
import { apiFetch } from '../api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function AdminDashboard({ token, onLogout, onAdminAction, products, categories, orders: initialOrders }) {
  const [activeTab, setActiveTab] = useState('analytics')
  const [orders, setOrders] = useState(initialOrders || [])
  const [loading, setLoading] = useState(false)
  const [orderFilter, setOrderFilter] = useState('pending') // Default to pending for approval flow

  useEffect(() => {
    if (initialOrders) setOrders(initialOrders)
  }, [initialOrders])

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true
    return o.status === orderFilter
  })

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const lowStockItems = products.filter(p => p.stock <= 5)
  const totalProducts = products.length
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0)
  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0)

  const sendWhatsAppInvoice = (order) => {
    const orderId = `#JM-${order.id.toString().slice(-6)}`
    const date = new Date(order.timestamp).toLocaleDateString()
    let message = `*JAMUI SUPER MART - INVOICE*\n`
    message += `--------------------------\n`
    message += `*Order ID:* ${orderId}\n`
    message += `*Date:* ${date}\n`
    message += `*Status:* ${order.status.toUpperCase()}\n`
    message += `--------------------------\n`
    
    order.items.forEach(item => {
      message += `${item.emoji} *${item.name}*\n`
      message += `   ₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}\n`
    })
    
    message += `--------------------------\n`
    message += `*TOTAL AMOUNT: ₹${order.total}*\n`
    message += `--------------------------\n`
    message += `Thank you for shopping with us!\n`
    message += `Visit again: jamuisupermart.in`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  // Enhanced Chart Data Preparation
  const categoryData = categories.filter(c => c !== 'All').map(cat => {
    const count = products.filter(p => p.category === cat).length
    return { category: cat, count }
  })

  // Sales Calendar Data (Revenue per day of current month)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  
  const calendarData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dayRevenue = orders
      .filter(o => {
        const d = new Date(o.timestamp)
        return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear && o.status === 'completed'
      })
      .reduce((acc, o) => acc + o.total, 0)
    return { day, revenue: dayRevenue }
  })

  const salesByDate = orders.reduce((acc, order) => {
    const date = new Date(order.timestamp).toLocaleDateString()
    acc[date] = (acc[date] || 0) + order.total
    return acc
  }, {})

  const lineChartData = {
    labels: Object.keys(salesByDate).slice(-7),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: Object.values(salesByDate).slice(-7),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const doughnutData = {
    labels: categoryData.map(d => d.category),
    datasets: [
      {
        data: categoryData.map(d => d.count),
        backgroundColor: [
          '#16a34a',
          '#22c55e',
          '#4ade80',
          '#86efac',
          '#bbf7d0',
        ],
        borderWidth: 0,
      },
    ],
  }

  const barChartData = {
    labels: products.slice(0, 8).map(p => p.name.split(' ')[0]),
    datasets: [
      {
        label: 'Current Stock',
        data: products.slice(0, 8).map(p => p.stock),
        backgroundColor: products.slice(0, 8).map(p => p.stock <= 5 ? '#ef4444' : '#16a34a'),
        borderRadius: 8,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-100 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-green-600 p-3 rounded-2xl shadow-lg shadow-green-200">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">Admin</h2>
            <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Dashboard v3.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'orders' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Orders
            <span className="ml-auto bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-xs">{orders.length}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'inventory' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            <Package className="w-5 h-5" />
            Inventory
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'categories' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            Categories
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-blue-500 hover:bg-blue-50 transition-all border border-blue-50 mt-4"
          >
            <ShoppingBag className="w-5 h-5" />
            View Store
          </button>
        </nav>

        <div className="mt-8 p-6 bg-orange-50 rounded-3xl border border-orange-100">
          <div className="flex items-center gap-2 text-orange-700 font-bold text-sm mb-3">
            <AlertTriangle className="w-4 h-4" />
            Stock Alert
          </div>
          <p className="text-xs text-orange-600 font-medium">
            {lowStockItems.length} items are running low on stock.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="mt-12 flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border border-red-50"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-h-screen">
        {activeTab === 'analytics' ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Total Revenue</p>
                <p className="text-4xl font-black text-gray-900">₹{totalRevenue}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-green-600 font-black uppercase tracking-widest">
                  <Activity className="w-3 h-3" /> Life-time Sales
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Orders Processed</p>
                <p className="text-4xl font-black text-gray-900">{orders.length}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-600 font-black uppercase tracking-widest">
                  <ClipboardList className="w-3 h-3" /> Completed + Pending
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Unique Customers</p>
                <p className="text-4xl font-black text-gray-900">
                  {new Set(orders.map(o => o.id.toString().slice(0, 8))).size}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-purple-600 font-black uppercase tracking-widest">
                  <User className="w-3 h-3" /> Estim. Reach
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Today's Sales</p>
                <p className="text-4xl font-black text-green-600">
                  ₹{orders.filter(o => new Date(o.timestamp).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.total, 0)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-green-600 font-black uppercase tracking-widest">
                  <Clock className="w-3 h-3" /> Live Tracking
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Category Sales Chart */}
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <PieChart className="w-6 h-6 text-blue-500" />
                    Sales by Category
                  </h3>
                </div>
                <div className="space-y-6">
                  {categoryData.map(item => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between text-sm font-black uppercase tracking-wider text-gray-500">
                        <span>{item.category}</span>
                        <span>Count: {item.count}</span>
                      </div>
                      <div className="h-3 bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${(item.count / totalProducts) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time-based Analytics */}
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-green-500" />
                    Sales History
                  </h3>
                </div>
                <div className="space-y-8">
                  {/* Sales Calendar View */}
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Monthly Sales Calendar</p>
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[8px] font-black text-gray-300">{d}</div>
                      ))}
                      {/* Empty cells for padding */}
                      {[...Array(new Date(currentYear, currentMonth, 1).getDay())].map((_, i) => (
                        <div key={`p-${i}`} className="aspect-square" />
                      ))}
                      {calendarData.map(d => (
                        <div 
                          key={d.day} 
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center relative group cursor-help transition-all ${
                            d.revenue > 0 ? 'bg-green-500 text-white shadow-sm' : 'bg-white border border-gray-100 text-gray-400'
                          }`}
                        >
                          <span className="text-[10px] font-black">{d.day}</span>
                          {d.revenue > 0 && (
                            <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
                          )}
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap font-black">
                            Day {d.day}: ₹{d.revenue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Sales */}
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">6-Month Trend</p>
                    <div className="flex items-end gap-3 h-32">
                      {[...Array(6)].map((_, i) => {
                        const date = new Date()
                        date.setMonth(date.getMonth() - (5 - i))
                        const monthLabel = date.toLocaleString('default', { month: 'short' })
                        const monthTotal = orders
                          .filter(o => new Date(o.timestamp).getMonth() === date.getMonth() && o.status === 'completed')
                          .reduce((a, b) => a + b.total, 0)
                        const maxTotal = Math.max(...orders.filter(o => o.status === 'completed').map(o => o.total), 1000)
                        const height = Math.min((monthTotal / (maxTotal * 5)) * 100, 100) // Scaled
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="w-full bg-green-200 rounded-t-xl transition-all group-hover:bg-green-500 relative" style={{ height: `${Math.max(height, 5)}%` }}>
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-black">
                                ₹{monthTotal}
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase">{monthLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Admin Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1: Inventory Management */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Package className="w-7 h-7 text-green-600" />
                </div>
                <h4 className="text-lg font-black text-gray-800 mb-2">Inventory Control</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Real-time stock tracking with low-stock alerts and automatic inventory deduction on sales.
                </p>
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs font-black uppercase tracking-widest text-green-600 flex items-center gap-2 hover:gap-3 transition-all"
                >
                  Manage Stock <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Feature 2: Sales Analytics */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-blue-600" />
                </div>
                <h4 className="text-lg font-black text-gray-800 mb-2">Sales Analytics</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Detailed breakdown of your revenue, popular products, and customer purchasing patterns.
                </p>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 hover:gap-3 transition-all"
                >
                  View Reports <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Feature 3: Order Processing */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-7 h-7 text-orange-600" />
                </div>
                <h4 className="text-lg font-black text-gray-800 mb-2">Order Workflow</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Seamless order approval process with instant WhatsApp invoice generation for customers.
                </p>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-black uppercase tracking-widest text-orange-600 flex items-center gap-2 hover:gap-3 transition-all"
                >
                  Process Orders <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-900 p-10 rounded-[3rem] text-white">
                <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                  <Activity className="w-6 h-6 text-green-400" />
                  System Status
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-sm font-bold text-gray-400">Database Connection</span>
                    <span className="flex items-center gap-2 text-xs font-black text-green-400 uppercase">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Connected
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-sm font-bold text-gray-400">Inventory Sync</span>
                    <span className="text-xs font-black text-blue-400 uppercase">Real-time</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-sm font-bold text-gray-400">Last Sale Update</span>
                    <span className="text-xs font-black text-gray-300 uppercase">
                      {orders.length > 0 ? new Date(orders[0].timestamp).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-600 p-10 rounded-[3rem] text-white flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-black mb-4">Store Growth 📈</h4>
                  <p className="text-green-100 font-medium leading-relaxed opacity-80 mb-8">
                    Your store is growing! You have processed {orders.filter(o => o.status === 'completed').length} orders this month. 
                    Keep updating your inventory to attract more customers.
                  </p>
                </div>
                <button 
                  onClick={() => onAdminAction('add')}
                  className="w-full py-5 bg-white text-green-600 rounded-2xl font-black text-lg hover:bg-green-50 transition-all shadow-xl shadow-green-900/20 active:scale-95"
                >
                  Add New Product
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="max-w-5xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Order Management</h1>
                <p className="text-gray-500 font-medium mt-1">Review, approve, and track customer purchases</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white border border-gray-100 p-1.5 rounded-2xl flex gap-1 shadow-sm">
                  <button 
                    onClick={() => setOrderFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${orderFilter === 'all' ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setOrderFilter('pending')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${orderFilter === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Pending
                  </button>
                  <button 
                    onClick={() => setOrderFilter('completed')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${orderFilter === 'completed' ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Approved
                  </button>
                </div>
                <button onClick={fetchOrders} className="bg-white border border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm group">
                  <Activity className={`w-5 h-5 text-gray-400 group-hover:text-green-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-green-600/20 border-t-green-600 rounded-full animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                  <ShoppingBag className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No {orderFilter} Orders</h3>
                <p className="text-gray-400 font-medium">Try changing the filter or refresh data.</p>
              </div>
            ) : (
              <div className="grid gap-8">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-green-900/5 transition-all group relative overflow-hidden">
                    {/* Status Badge Overlay */}
                    <div className={`absolute top-0 right-0 px-8 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'
                    }`}>
                      {order.status}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-10">
                      {/* Left: Order Info */}
                      <div className="lg:w-1/3 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-gray-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Order ID</p>
                            <h4 className="text-xl font-black text-gray-900">#JM-{order.id.toString().slice(-6)}</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50/50 p-4 rounded-2xl">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" /> Date
                            </p>
                            <p className="text-sm font-black text-gray-700">{new Date(order.timestamp).toLocaleDateString()}</p>
                          </div>
                          <div className="bg-gray-50/50 p-4 rounded-2xl">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> Time
                            </p>
                            <p className="text-sm font-black text-gray-700">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>

                        <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                          <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Total Bill</p>
                          <p className="text-4xl font-black text-green-700">₹{order.total}</p>
                        </div>
                      </div>

                      {/* Right: Items & Actions */}
                      <div className="flex-1 space-y-6">
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-3 h-3" /> Purchased Items ({order.items.length})
                          </p>
                          <div className="grid gap-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50/50 p-4 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="bg-gray-100 w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden">
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-2xl">{item.emoji}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800 leading-none mb-1">{item.name}</p>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.category}</p>
                                  </div>
                                </div>
                                <p className="font-black text-gray-900">₹{item.price} <span className="text-gray-300 mx-1">×</span> {item.quantity}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                          {order.status === 'pending' ? (
                            <button 
                              onClick={() => onAdminAction('updateOrderStatus', { id: order.id, status: 'completed' })}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-100 active:scale-95"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              Approve Sale
                            </button>
                          ) : (
                            <div className="flex-1 bg-gray-50 text-gray-400 font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-3 border border-gray-100">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              Sale Completed
                            </div>
                          )}
                          
                          <button 
                            onClick={() => sendWhatsAppInvoice(order)}
                            className="bg-white border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <MessageSquare className="w-5 h-5" />
                            Send Invoice
                          </button>

                          <button 
                            onClick={() => onAdminAction('deleteOrder', { id: order.id })}
                            className="bg-red-50 text-red-400 hover:bg-red-600 hover:text-white p-4 rounded-2xl transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="max-w-6xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Inventory Management</h1>
                <p className="text-gray-500 font-medium mt-1">Manage, edit, and update your grocery stock</p>
              </div>
              <button 
                onClick={() => onAdminAction('add')}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Add New Product
              </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm group hover:shadow-2xl hover:shadow-green-900/5 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{product.emoji}</span>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => onAdminAction('edit', product)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onAdminAction('delete', product)}
                        className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 leading-tight line-clamp-1">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] bg-green-50 text-green-700 font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border border-green-100">
                      {product.category}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${
                      product.stock <= 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-green-700">₹{product.price}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-green-600" />
                Manage Categories
              </h2>
              <button 
                onClick={() => {
                  const name = prompt('Enter new category name:')
                  if (name) onAdminAction('addCategory', name)
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-3 rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-green-100"
              >
                <Plus className="w-5 h-5" />
                Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.filter(c => c !== 'All').map(category => (
                <div key={category} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-green-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center text-green-600 font-bold">
                      {category[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-800">{category}</p>
                      <p className="text-xs text-gray-400 font-bold">{products.filter(p => p.category === category).length} Products</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onAdminAction('deleteCategory', category)}
                    className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
