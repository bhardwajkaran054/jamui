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
  User,
  Tag,
  Bell,
  Menu,
  X,
  Download
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [customers, setCustomers] = useState([])
  const [promoCodes, setPromoCodes] = useState([])
  const [stockLogs, setStockLogs] = useState([])
  const [notices, setNotices] = useState({ text: '', active: false })
  const [deliveryZones, setDeliveryZones] = useState([])

  const [lastSync, setLastSync] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'syncing', 'error'

  useEffect(() => {
    if (initialOrders) setOrders(initialOrders)
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'promo-codes') fetchPromoCodes()
    if (activeTab === 'stock-logs') fetchStockLogs()
    if (activeTab === 'notices') fetchNotices()
    if (activeTab === 'delivery-zones') fetchDeliveryZones()
  }, [initialOrders, activeTab])

  // Sync Timer for indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setLastSync(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/customers')
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPromoCodes = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/promo-codes')
      setPromoCodes(data)
    } catch (err) {
      console.error('Failed to fetch promo codes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStockLogs = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/stock-logs')
      setStockLogs(data)
    } catch (err) {
      console.error('Failed to fetch stock logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotices = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/notices')
      setNotices(data)
    } catch (err) {
      console.error('Failed to fetch notices:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliveryZones = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/delivery-zones')
      setDeliveryZones(data)
    } catch (err) {
      console.error('Failed to fetch delivery zones:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateNotice = async (newNotice) => {
    try {
      await apiFetch('/notices', {
        method: 'POST',
        body: JSON.stringify(newNotice)
      })
      setNotices(newNotice)
      alert('Notice updated successfully!')
    } catch (err) {
      console.error('Failed to update notice:', err)
    }
  }

  const handleAddPromoCode = async () => {
    const code = prompt('Enter promo code:')
    if (!code) return
    const discount = prompt('Enter discount amount (₹):')
    if (!discount) return
    const minOrder = prompt('Enter minimum order amount (₹):', '0')
    
    try {
      await apiFetch('/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code,
          discount: parseFloat(discount),
          minOrder: parseFloat(minOrder || '0'),
          active: true
        })
      })
      fetchPromoCodes()
    } catch (err) {
      console.error('Failed to add promo code:', err)
    }
  }

  const handleAddDeliveryZone = async () => {
    const name = prompt('Enter zone name (e.g. Local, Outer):')
    if (!name) return
    const fee = prompt('Enter delivery fee (₹):')
    if (!fee) return
    
    try {
      await apiFetch('/delivery-zones', {
        method: 'POST',
        body: JSON.stringify({
          name,
          fee: parseFloat(fee)
        })
      })
      fetchDeliveryZones()
    } catch (err) {
      console.error('Failed to add delivery zone:', err)
    }
  }

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
  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.total, 0)
  const uniqueCustomersCount = new Set(orders.filter(o => o.customer && o.customer.phone).map(o => o.customer.phone)).size

  const generatePDFInvoice = (order) => {
    // Generate unique content for the new window
    const orderId = `#JM-${order.id.toString().slice(-6)}`;
    const date = new Date(order.timestamp).toLocaleDateString();
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="font-weight: 700; color: #111827;">${item.emoji} ${item.name}</div>
          <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">${item.category}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: center; font-weight: 700;">${item.quantity}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 900;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Invoice ${orderId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #374151; line-height: 1.5; }
            .invoice-container { max-width: 800px; margin: auto; border: 1px solid #e5e7eb; padding: 40px; border-radius: 24px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
            .logo-section h1 { font-size: 24px; font-weight: 900; color: #16a34a; margin: 0; letter-spacing: -0.025em; }
            .logo-section p { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 0.1em; }
            .order-info { text-align: right; }
            .order-info p { margin: 2px 0; font-size: 12px; font-weight: 700; }
            .order-id { font-size: 18px; font-weight: 900; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6; }
            .totals { margin-top: 30px; border-top: 2px solid #f3f4f6; padding-top: 20px; }
            .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 8px; font-size: 14px; }
            .grand-total { font-size: 24px; font-weight: 900; color: #16a34a; margin-top: 10px; }
            .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
              <div class="header">
                <div class="logo-section">
                  <h1>JAMUI SUPER MART</h1>
                  <p>Professional Grocery Services</p>
                </div>
                <div class="order-info">
                  <p class="order-id">${orderId}</p>
                  <p style="color: #9ca3af;">Date: ${date}</p>
                  <p style="color: ${order.status === 'completed' ? '#16a34a' : '#f59e0b'};">Status: ${order.status.toUpperCase()}</p>
                </div>
              </div>

              <div style="margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 16px; border: 1px solid #f3f4f6;">
                <p style="margin: 0 0 10px 0; font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em;">Customer Details</p>
                <div style="display: flex; gap: 40px;">
                  <div>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">Name</p>
                    <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #111827;">${order.customer?.name || 'Guest Customer'}</p>
                  </div>
                  <div>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">WhatsApp</p>
                    <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #111827;">${order.customer?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Item Description</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Total Price</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            
            <div class="totals">
              <div class="total-row">
                <span style="color: #9ca3af;">SUBTOTAL</span>
                <span style="width: 100px; text-align: right; font-weight: 700;">₹${order.total}</span>
              </div>
              <div class="total-row grand-total">
                <span>TOTAL DUE</span>
                <span style="width: 120px; text-align: right;">₹${order.total}</span>
              </div>
            </div>
            
            <div class="footer">
              Thank you for choosing Jamui Super Mart!<br/>
              Visit again: www.jamuisupermart.in | Support: +91 78560 53987
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  }

  const sendWhatsAppInvoice = (order) => {
    // 1. Generate the professional PDF first
    generatePDFInvoice(order)

    // 2. Ask user to proceed to WhatsApp (This ensures the second window.open is not blocked)
    if (confirm('PDF Invoice generated! Open WhatsApp to share the order summary?')) {
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
      message += `*Live Tracking:* jamuisupermart.in/#/track/${order.id}\n`
      message += `--------------------------\n`
      message += `_Please attach the PDF invoice you just saved._\n`
      message += `--------------------------\n`
      message += `Thank you for shopping with us!\n`
      message += `Visit again: jamuisupermart.in`

      const encodedMessage = encodeURIComponent(message)
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
    }
  }

  const exportToCSV = () => {
    if (orders.length === 0) return;
    
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Total Amount', 'Status', 'Items'];
    const rows = orders.map(order => [
      `JM-${order.id.toString().slice(-6)}`,
      new Date(order.timestamp).toLocaleDateString(),
      order.customer?.name || 'Guest',
      order.customer?.phone || 'N/A',
      order.total,
      order.status,
      order.items.map(i => `${i.name}(x${i.quantity})`).join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `jamui_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Enhanced Chart Data Preparation
  const categoryData = categories.filter(c => c !== 'All').map(cat => {
    const count = products.filter(p => p.category === cat).length
    const total = orders.filter(o => o.items.some(i => i.category === cat) && o.status === 'completed').reduce((acc, o) => acc + o.total, 0)
    return { category: cat, count, total }
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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden h-screen">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-8 right-8 z-[110] bg-green-600 text-white p-4 rounded-full shadow-2xl active:scale-95 transition-all"
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-72 bg-white border-r border-gray-100 p-8 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-green-600 p-3 rounded-2xl shadow-lg shadow-green-200">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">Admin</h2>
            <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Dashboard v4.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2">
          {[
            { id: 'analytics', label: 'Dashboard', icon: BarChart3 },
            { id: 'orders', label: 'Order Records', icon: ClipboardList, count: orders.filter(o => o.status === 'pending').length },
            { id: 'inventory', label: 'Store Inventory', icon: Package },
            { id: 'categories', label: 'Product Groups', icon: LayoutGrid },
            { id: 'customers', label: 'Customers', icon: User },
            { id: 'promo-codes', label: 'Promo Codes', icon: Tag },
            { id: 'delivery-zones', label: 'Delivery Zones', icon: ShoppingBag },
            { id: 'notices', label: 'Notice Board', icon: MessageSquare },
            { id: 'stock-logs', label: 'Stock History', icon: Clock },
            { id: 'alerts', label: 'Stock Alerts', icon: Bell, count: lowStockItems.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setIsSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all relative ${
                activeTab === tab.id ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full ${tab.id === 'alerts' ? 'animate-pulse' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}

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
          className="mt-8 flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border border-red-50"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto max-h-screen relative">
        {/* Mobile Header Overlay */}
        <div className="lg:hidden flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight capitalize">{activeTab}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Admin Dashboard</p>
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded-full border border-green-100">
                <div className={`w-1 h-1 rounded-full ${syncStatus === 'synced' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
                <span className="text-[8px] font-black text-green-600 uppercase">Live</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Desktop Sync Indicator */}
        <div className="hidden lg:flex absolute top-12 right-12 items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 z-10">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'synced' ? 'text-green-600' : 'text-orange-600'}`}>
                {syncStatus === 'synced' ? 'Cloud Synced' : 'Syncing...'}
              </span>
              <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500 shadow-lg shadow-green-200 animate-pulse' : 'bg-orange-500 animate-spin'}`} />
            </div>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Last Update: {lastSync.toLocaleTimeString()}</p>
          </div>
          <button 
            onClick={async () => {
              setSyncStatus('syncing');
              await fetchOrders();
              setLastSync(new Date());
              setSyncStatus('synced');
            }}
            className="p-2 hover:bg-gray-50 rounded-xl transition-all active:scale-95 group"
            title="Force Refresh"
          >
            <Activity className={`w-4 h-4 text-gray-400 group-hover:text-green-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          </button>
        </div>

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
                  {uniqueCustomersCount}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-purple-600 font-black uppercase tracking-widest">
                  <User className="w-3 h-3" /> From History
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
                        <div className="flex gap-4">
                          <span>Items: {item.count}</span>
                          <span className="text-green-600">₹{item.total}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${(item.total / (totalRevenue || 1)) * 100}%` }}
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

            {/* Admin Features Suite & System Health Monitor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-900 p-10 rounded-[3rem] text-white">
                <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                  <Activity className="w-6 h-6 text-green-400" />
                  System Health Monitor
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-sm font-bold text-gray-400">Database Engine</span>
                    <span className="flex items-center gap-2 text-xs font-black text-green-400 uppercase">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Live & Stable
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-sm font-bold text-gray-400">Public Writes</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black uppercase ${token ? 'text-blue-400' : 'text-red-400'}`}>
                        {token ? 'Enabled' : 'Token Missing'}
                      </span>
                      {token && (
                        <button 
                          onClick={() => {
                            const authUrl = `${window.location.origin}/#/auth/${token}`;
                            navigator.clipboard.writeText(authUrl);
                            alert('Authorization link copied! Open this link on your mobile or private window to enable cloud sync.');
                          }}
                          className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-blue-600/30 hover:bg-blue-600/40 transition-all"
                        >
                          Sync Link
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="text-sm font-bold text-gray-400">Auto-Polling</span>
                    <span className="text-xs font-black text-blue-400 uppercase">30s Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                  <LayoutGrid className="w-6 h-6 text-blue-600" />
                  Admin Features Suite
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-1">Promo Codes</p>
                    <p className="text-[10px] text-blue-500 font-bold leading-tight">Create & manage discounts</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Notice Board</p>
                    <p className="text-[10px] text-green-500 font-bold leading-tight">Update store announcements</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <p className="text-xs font-black text-orange-700 uppercase tracking-widest mb-1">Stock History</p>
                    <p className="text-[10px] text-orange-500 font-bold leading-tight">Full audit trail of stock</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <p className="text-xs font-black text-purple-700 uppercase tracking-widest mb-1">Customers</p>
                    <p className="text-[10px] text-purple-500 font-bold leading-tight">View loyalty & spending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'alerts' ? (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Stock Alerts Center</h1>
              <p className="text-gray-500 font-medium mt-1">Items that are critically low or out of stock</p>
            </header>

            {lowStockItems.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">All Stocked Up!</h3>
                <p className="text-gray-400 font-medium">No items are currently low on stock.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {lowStockItems.map(item => (
                  <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-red-50 shadow-sm flex items-center justify-between hover:border-red-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="bg-red-50 w-20 h-20 rounded-2xl flex items-center justify-center relative">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <span className="text-4xl">{item.emoji}</span>
                        )}
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                          {item.stock}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{item.category} • {item.unit}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            item.stock === 0 ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {item.stock === 0 ? 'Out of Stock' : 'Low Stock Alert'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onAdminAction('edit', item)}
                      className="bg-gray-900 text-white font-black px-8 py-4 rounded-2xl hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Restock Now
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                <button 
                  onClick={exportToCSV}
                  title="Export to CSV"
                  className="bg-white border border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm group"
                >
                  <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
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

                        {/* New: Customer Quick Info */}
                        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-3">Customer Information</p>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <p className="text-sm font-black text-gray-800">{order.customer?.name || 'Guest'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <MessageSquare className="w-4 h-4 text-green-600" />
                              </div>
                              <p className="text-sm font-black text-gray-800">{order.customer?.phone || 'N/A'}</p>
                            </div>
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
                                  <div className="bg-gray-100 w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden relative">
                                    {item.image ? (
                                      <img 
                                        src={item.image} 
                                        alt={item.name} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.parentElement.innerHTML = `<span class="text-2xl">${item.emoji}</span>`;
                                        }}
                                      />
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
                            <div className="flex-1 flex gap-3">
                              <button 
                                onClick={() => {
                                  const est = prompt('Estimated Delivery (e.g. 30-45 mins):', '30-45 mins');
                                  onAdminAction('updateOrderStatus', { id: order.id, status: 'completed', estimatedDelivery: est });
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-100 active:scale-95"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                                Approve
                              </button>
                              <button 
                                onClick={() => {
                                  const reason = prompt('Reason for rejection (Optional):', 'Item out of stock');
                                  if (confirm('Are you sure you want to reject this order?')) {
                                    onAdminAction('updateOrderStatus', { id: order.id, status: 'rejected', rejectReason: reason });
                                  }
                                }}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 border border-red-100"
                              >
                                <XCircle className="w-5 h-5" />
                                Reject
                              </button>
                            </div>
                          ) : order.status === 'completed' ? (
                            <div className="flex-1 bg-gray-50 text-gray-400 font-black px-6 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border border-gray-100">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Sale Completed
                              </div>
                              {order.estimatedDelivery && (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                  Delivery: {order.estimatedDelivery}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 bg-red-50 text-red-400 font-black px-6 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border border-red-100">
                              <div className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-500" />
                                Order Rejected
                              </div>
                              {order.rejectReason && (
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                                  Reason: {order.rejectReason}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <button 
                            onClick={() => sendWhatsAppInvoice(order)}
                            className="bg-white border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <MessageSquare className="w-5 h-5" />
                            WhatsApp
                          </button>

                          <button 
                            onClick={() => generatePDFInvoice(order)}
                            className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-black px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <Download className="w-5 h-5" />
                            PDF
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
        ) : activeTab === 'customers' ? (
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Customer Directory</h1>
              <p className="text-gray-500 font-medium mt-1">Track customer loyalty and order history</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customers.map(customer => (
                <div key={customer.phone} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center">
                      <User className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">{customer.name || 'Anonymous'}</h4>
                      <p className="text-sm text-gray-400 font-bold">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Total Spent</p>
                      <p className="text-lg font-black text-green-600">₹{customer.totalSpent}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Orders</p>
                      <p className="text-lg font-black text-blue-600">{customer.orderCount}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] text-green-600 font-black uppercase">Loyalty Points</span>
                    <span className="text-lg font-black text-green-700">⭐ {customer.loyaltyPoints}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'promo-codes' ? (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Promo Codes</h1>
                <p className="text-gray-500 font-medium mt-1">Manage discounts and offers</p>
              </div>
              <button 
                onClick={handleAddPromoCode}
                className="bg-green-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-green-200"
              >
                + Add New
              </button>
            </header>

            <div className="grid gap-6">
              {promoCodes.map(promo => (
                <div key={promo.code} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center">
                      <Tag className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900">{promo.code}</h4>
                      <p className="text-sm text-gray-500 font-bold">₹{promo.discount} OFF (Min: ₹{promo.minOrder})</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if(confirm('Delete this promo code?')) {
                        await apiFetch(`/promo-codes/${promo.code}`, { method: 'DELETE' });
                        fetchPromoCodes();
                      }
                    }}
                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'delivery-zones' ? (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Delivery Zones</h1>
                <p className="text-gray-500 font-medium mt-1">Set fees based on customer location</p>
              </div>
              <button 
                onClick={handleAddDeliveryZone}
                className="bg-blue-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-blue-200"
              >
                + Add Zone
              </button>
            </header>

            <div className="grid gap-6">
              {deliveryZones.map(zone => (
                <div key={zone.name} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900">{zone.name}</h4>
                      <p className="text-sm text-gray-500 font-bold">Delivery Fee: ₹{zone.fee}</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if(confirm('Delete this delivery zone?')) {
                        await apiFetch(`/delivery-zones/${encodeURIComponent(zone.name)}`, { method: 'DELETE' });
                        fetchDeliveryZones();
                      }
                    }}
                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'notices' ? (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Notice Board</h1>
              <p className="text-gray-500 font-medium mt-1">Update the announcement banner on your website</p>
            </header>

            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Banner Message</label>
                <textarea 
                  value={notices.text}
                  onChange={(e) => setNotices({ ...notices, text: e.target.value })}
                  placeholder="Enter notice text here (e.g. Free delivery on orders above ₹500!)"
                  className="w-full border border-gray-200 rounded-[2rem] p-6 focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700 min-h-[150px]"
                />
              </div>

              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
                <span className="font-bold text-gray-700">Display Banner?</span>
                <button 
                  onClick={() => setNotices({ ...notices, active: !notices.active })}
                  className={`w-16 h-8 rounded-full transition-all relative ${notices.active ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${notices.active ? 'left-9' : 'left-1'}`} />
                </button>
              </div>

              <button 
                onClick={() => handleUpdateNotice(notices)}
                className="w-full bg-green-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-green-100"
              >
                Save Notice
              </button>
            </div>
          </div>
        ) : activeTab === 'stock-logs' ? (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
            <header>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Stock History Logs</h1>
              <p className="text-gray-500 font-medium mt-1">Full audit trail of all inventory changes</p>
            </header>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-100">
                    <th className="text-left p-6 text-[10px] font-black uppercase text-gray-400">Time</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase text-gray-400">Product</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase text-gray-400">Old</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase text-gray-400">New</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase text-gray-400">Change</th>
                    <th className="text-left p-6 text-[10px] font-black uppercase text-gray-400">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stockLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-xs font-bold text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-6 font-black text-gray-800">{log.productName}</td>
                      <td className="p-6 font-bold text-gray-400">{log.oldStock}</td>
                      <td className="p-6 font-black text-gray-900">{log.newStock}</td>
                      <td className="p-6">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                          log.newStock > log.oldStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {log.newStock > log.oldStock ? '+' : ''}{log.newStock - log.oldStock}
                        </span>
                      </td>
                      <td className="p-6 text-xs font-medium text-gray-500">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner overflow-hidden relative">
                      {product.useImage && product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = `<span class="text-3xl">${product.emoji}</span>`;
                          }}
                        />
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
