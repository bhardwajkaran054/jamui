import { useState, useEffect } from 'react'
import { Package, ClipboardList, LogOut, Trash2, Edit3, Plus, Clock, TrendingDown, AlertTriangle, BarChart3, PieChart, Activity } from 'lucide-react'
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

export default function AdminDashboard({ token, onLogout, onAdminAction, products, categories }) {
  const [activeTab, setActiveTab] = useState('analytics')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [activeTab])

  const fetchOrders = async () => {
    try {
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

  // Chart Data Preparation
  const categoryData = categories.filter(c => c !== 'All').map(cat => {
    const count = products.filter(p => p.category === cat).length
    return { category: cat, count }
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
          <div className="max-w-6xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
                <p className="text-gray-500 font-medium mt-1">Real-time performance and inventory insights</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-white border border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm group"
                  title="Refresh Data"
                >
                  <Activity className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </button>
                <button 
                  onClick={onLogout}
                  className="bg-red-50 text-red-600 font-black px-8 py-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-3 active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Total Revenue</p>
                <p className="text-4xl font-black text-green-700">₹{totalRevenue}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-bold">
                  <Activity className="w-3 h-3" /> +12% from last month
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Total Orders</p>
                <p className="text-4xl font-black text-gray-900">{orders.length}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 font-bold">
                  <ClipboardList className="w-3 h-3" /> All time sales
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Total Products</p>
                <p className="text-4xl font-black text-gray-900">{totalProducts}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 font-bold">
                  <Package className="w-3 h-3" /> Unique SKUs
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Inventory Count</p>
                <p className="text-4xl font-black text-gray-900">{totalStock}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-bold">
                  <Activity className="w-3 h-3" /> Total items in stock
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Low Stock Alert</p>
                <p className="text-4xl font-black text-orange-600">{lowStockItems.length}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 font-bold">
                  <TrendingDown className="w-3 h-3" /> Items need refill
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-8">Revenue Growth</h3>
                <div className="h-[300px]">
                  <Line data={lineChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-8">Category Distribution</h3>
                <div className="h-[300px] flex justify-center">
                  <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm lg:col-span-2">
                <h3 className="text-xl font-black text-gray-900 mb-8">Stock Levels (Top 8 Products)</h3>
                <div className="h-[300px]">
                  <Bar data={barChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Recent Orders</h1>
                <p className="text-gray-500 font-medium mt-1">Manage and track your customer orders</p>
              </div>
              <button onClick={fetchOrders} className="bg-white border border-gray-100 p-3 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                <Clock className="w-5 h-5 text-gray-400" />
              </button>
            </header>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                <div className="text-6xl mb-6 opacity-20">📦</div>
                <h3 className="text-xl font-bold text-gray-400">No orders found yet</h3>
              </div>
            ) : (
              <div className="grid gap-6">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-green-900/5 transition-all group">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                          <ClipboardList className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Order ID</p>
                          <h4 className="text-xl font-black text-gray-900">#JM-{order.id.toString().padStart(4, '0')}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Timestamp</p>
                        <p className="text-sm font-bold text-gray-700">{new Date(order.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">{item.emoji}</span>
                            <div>
                              <p className="font-bold text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{item.category}</p>
                            </div>
                          </div>
                          <p className="font-black text-green-700">₹{item.price} x {item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                      <div>
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">Status</p>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                          order.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-3xl font-black text-green-700">₹{order.total}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
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
                    <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner">
                      <span className="text-3xl">{product.emoji}</span>
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
        )}
      </main>
    </div>
  )
}
