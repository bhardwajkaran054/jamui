import { useState, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Steps from './components/Steps'
import ProductList from './components/ProductList'
import Cart from './components/Cart'
import Footer from './components/Footer'
import OrderTracking from './components/OrderTracking'
import AdminLogin from './components/AdminLogin'
import SecretChallenge from './components/SecretChallenge'
import AdminDashboard from './components/AdminDashboard'
import ProductEditModal from './components/ProductEditModal'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { apiFetch, API_URL } from './api'
import { soundService } from './services/soundService'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

export default function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [orders, setOrders] = useState([])
  const [promoCodes, setPromoCodes] = useState([])
  const [notice, setNotice] = useState({ text: '', active: false })
  const [deliveryZones, setDeliveryZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('githubToken')
    } catch (e) {
      return null
    }
  })
  const [showLogin, setShowLogin] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [passedSecret, setPassedSecret] = useState(() => {
    try {
      return sessionStorage.getItem('passedSecret') === 'true'
    } catch (e) {
      return false
    }
  })
  const [toast, setToast] = useState(null)
  
  // Admin Editing States
  const [editingProduct, setEditingProduct] = useState(null)
  const [isAdding, setIsAdding] = useState(false)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/products')
      if (data) setProducts(data)
    } catch (err) {
      console.error('[API ERROR] Products fetch failed:', err.message)
      // showNotification(`API Error: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/categories')
      if (data) setCategories(data)
    } catch (err) {
      console.error('[API ERROR] Categories fetch failed:', err.message)
    }
  }

  const fetchOrders = async () => {
    try {
      const data = await apiFetch('/orders');
      
      if (data && Array.isArray(data)) {
        setOrders(data)
        // Store the latest orders in local storage so other windows can see them too
        localStorage.setItem('cachedOrders', JSON.stringify(data))
      }
      return data
    } catch (err) {
      console.error('[API ERROR] Orders fetch failed:', err.message)
      // Fallback to local storage if API fails
      const cached = localStorage.getItem('cachedOrders')
      if (cached) {
        const parsed = JSON.parse(cached)
        setOrders(parsed)
        return parsed
      }
      return []
    }
  }

  const fetchPromoCodes = async () => {
    try {
      const data = await apiFetch('/promo-codes')
      if (data) setPromoCodes(data)
    } catch (err) {
      console.error('[API ERROR] Promo codes fetch failed:', err.message)
    }
  }

  const fetchNotice = async () => {
    try {
      const data = await apiFetch('/notices')
      if (data) setNotice(data)
    } catch (err) {
      console.error('[API ERROR] Notices fetch failed:', err.message)
    }
  }

  const fetchDeliveryZones = async () => {
    try {
      const data = await apiFetch('/delivery-zones')
      if (data) setDeliveryZones(data)
    } catch (err) {
      console.error('[API ERROR] Delivery zones fetch failed:', err.message)
    }
  }

  useEffect(() => {
    // Initial fetch from Local Storage for instant UI
    try {
      const cached = localStorage.getItem('cachedOrders')
      if (cached) setOrders(JSON.parse(cached))
    } catch (e) {}

    const initData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchOrders(),
          fetchPromoCodes(),
          fetchNotice(),
          fetchDeliveryZones()
        ])
      } catch (err) {
        console.error('[INIT ERROR] Data initialization failed:', err.message)
      }
    }
    initData()
    
    if (token) setIsAdmin(true)

    // Handle token-cleared event from githubService
    const handleTokenCleared = () => {
      setToken(null)
      setIsAdmin(false)
      showNotification('Session Expired. Please log in again.', 'error')
    }
    window.addEventListener('github-token-cleared', handleTokenCleared)

    // Polling for new orders (Only for admin with token to avoid rate limits)
    let pollInterval = null;
    if (token) {
      pollInterval = setInterval(async () => {
        try {
          const latestOrders = await fetchOrders()
          
          if (latestOrders && latestOrders.length > 0) {
            const storedOrders = JSON.parse(localStorage.getItem('adminKnownOrders') || '[]')
            const newOrders = latestOrders.filter(o => !storedOrders.map(String).includes(o.id.toString()))
            
            if (newOrders.length > 0) {
              soundService.play('order')
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Jamui Super Mart Admin', {
                  body: `You have ${newOrders.length} new order(s) waiting for approval!`,
                  icon: '/favicon.svg'
                })
              }
              showNotification(`Received ${newOrders.length} new order(s)!`, 'success')
              const updatedKnown = [...new Set([...storedOrders.map(String), ...latestOrders.map(o => o.id.toString())])]
              localStorage.setItem('adminKnownOrders', JSON.stringify(updatedKnown))
            }
          }
        } catch (err) {
          console.warn('[POLLING] Fetch failed. Skipping interval.');
        }
      }, 15000)
    }

    // Secret /admin path detection
    const isPathAdmin = window.location.hash.includes('/admin') || window.location.pathname.endsWith('/admin')
    if (isPathAdmin) {
      if (!passedSecret) {
        setShowSecret(true)
      } else if (!token) {
        setShowLogin(true)
      }
    } else {
      // Hide admin overlays if we are not on the admin path
      setShowSecret(false)
      setShowLogin(false)
    }

    // Direct tracking link detection
    const hash = window.location.hash
    if (hash.includes('/track/')) {
      const trackId = hash.split('/track/')[1]
      if (trackId) {
        localStorage.setItem('latestOrderId', trackId)
        setTrackingOpen(true)
      }
    }

    // One-time authorization link detection
    if (hash.includes('/auth/')) {
      const authToken = hash.split('/auth/')[1]
      if (authToken && authToken.startsWith('ghp_')) {
        localStorage.setItem('githubToken', authToken)
        localStorage.setItem('publicOrderToken', authToken)
        setToken(authToken)
        setIsAdmin(true)
        showNotification('Device Authorized for Cloud Sync!', 'success')
        window.location.hash = '/' // Clear the token from URL
      }
    }

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('github-token-cleared', handleTokenCleared)
    }
  }, [token, passedSecret])

  const showNotification = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAdminAction = async (action, data) => {
    if (action === 'delete') {
      if (!confirm('Are you sure you want to delete this product?')) return
      try {
        await apiFetch(`/products/${data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `token ${token.trim()}` }
        })
        showNotification('Product deleted successfully')
        await fetchProducts()
        await fetchCategories()
      } catch (err) {
        showNotification(err.message || 'Delete failed', 'error')
      }
    } else if (action === 'deleteCategory') {
      if (!confirm(`Are you sure you want to delete category "${data}"? Products in this category will be moved to "Other".`)) return
      try {
        await apiFetch(`/categories/${encodeURIComponent(data)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `token ${token.trim()}` }
        })
        showNotification('Category deleted successfully')
        await fetchProducts()
        await fetchCategories()
      } catch (err) {
        showNotification(err.message || 'Delete failed', 'error')
      }
    } else if (action === 'addCategory') {
      try {
        await apiFetch('/categories', {
          method: 'POST',
          headers: { 'Authorization': `token ${token.trim()}` },
          body: JSON.stringify({ name: data })
        })
        showNotification('Category added successfully')
        await fetchCategories()
      } catch (err) {
        showNotification(err.message || 'Add category failed', 'error')
      }
    } else if (action === 'updateOrderStatus') {
      try {
        await apiFetch(`/orders/${data.id}`, {
          method: 'PUT',
          headers: { 'Authorization': `token ${token.trim()}` },
          body: JSON.stringify({ 
            status: data.status,
            estimatedDelivery: data.estimatedDelivery,
            rejectReason: data.rejectReason
          })
        })
        showNotification(`Order ${data.status} successfully`)
        await fetchOrders()
      } catch (err) {
        showNotification(err.message || 'Update failed', 'error')
      }
    } else if (action === 'deleteOrder') {
      if (!confirm('Delete this order record?')) return
      try {
        await apiFetch(`/orders/${data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `token ${token.trim()}` }
        })
        showNotification('Order deleted')
        await fetchOrders()
      } catch (err) {
        showNotification(err.message || 'Delete failed', 'error')
      }
    } else if (action === 'edit') {
      setEditingProduct(data)
    } else if (action === 'add') {
      setIsAdding(true)
    } else if (action === 'save') {
      try {
        await apiFetch('/products', {
          method: 'POST',
          headers: { 'Authorization': `token ${token.trim()}` },
          body: JSON.stringify(data)
        })
        showNotification('Product saved successfully')
        await fetchProducts()
        await fetchCategories()
        setEditingProduct(null)
        setIsAdding(false)
      } catch (err) {
        showNotification(err.message || 'Save failed', 'error')
      }
    }
  }

  const handleLogin = (newToken) => {
    setToken(newToken)
    localStorage.setItem('githubToken', newToken)
    setIsAdmin(true)
    setShowLogin(false)
    showNotification('Welcome back, Admin!')
    
    // Refresh all data now that we are admin
    const initData = async () => {
      await Promise.all([fetchProducts(), fetchCategories(), fetchOrders(), fetchPromoCodes(), fetchNotice(), fetchDeliveryZones()])
    }
    initData()
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('githubToken')
    sessionStorage.removeItem('passedSecret')
    setPassedSecret(false)
    setIsAdmin(false)
    window.location.href = '/'
  }

  const handleOrder = async (cartItems, total, customerInfo) => {
    try {
      const orderData = {
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: cart[item.id],
          emoji: item.emoji,
          category: item.category
        })),
        total,
        customer: customerInfo,
        timestamp: new Date().toISOString()
      };

      // 1. Post to Server (Directly)
      const result = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      if (!result || !result.id) {
        throw new Error('Server failed to confirm order');
      }

      // 2. Local feedback and cleanup
      const orderId = result.id;
      localStorage.setItem('latestOrderId', orderId);
      
      const localOrder = { ...orderData, id: orderId, status: 'pending' };
      const updatedOrders = [localOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem('cachedOrders', JSON.stringify(updatedOrders));

      setCart({});
      soundService.play('order');
      
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#166534', '#15803d', '#22c55e']
      });

      showNotification('Order placed successfully!');
      
      setTimeout(() => {
        setTrackingOpen(true);
      }, 2000);

      return { success: true, order: localOrder };
    } catch (err) {
      console.error('[CRITICAL ORDER ERROR]:', err.message);
      showNotification('Checkout failed. Please try again.', 'error');
      return { success: false };
    }
  }

  const addToCart = (product) => {
    setCart(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
    soundService.play('add')
  }

  const removeFromCart = (product) => {
    setCart(prev => {
      const qty = (prev[product.id] || 0) - 1
      if (qty <= 0) {
        const next = { ...prev }
        delete next[product.id]
        return next
      }
      return { ...prev, [product.id]: qty }
    })
    soundService.play('remove')
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <div>
            <h2 className="text-2xl font-black text-gray-900">Jamui Super Mart</h2>
            <p className="text-gray-500 font-bold animate-pulse mt-1">Connecting to repository...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Connection Failed</h2>
          <p className="text-gray-500 font-medium mb-6">
            We couldn't load the product data. This might be due to an invalid token or repository path.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white font-black px-6 py-3 rounded-2xl hover:bg-red-700 transition-all"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('githubToken');
                window.location.reload();
              }}
              className="text-red-600 font-bold text-sm hover:underline"
            >
              Reset Token & Login Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isPathAdmin = window.location.hash.includes('/admin') || window.location.pathname.endsWith('/admin')
  if (isPathAdmin && isAdmin && token) {
    return (
      <>
        <AdminDashboard 
          token={token}
          onLogout={handleLogout}
          onAdminAction={handleAdminAction}
          products={products}
          categories={categories}
          orders={orders}
        />
        {(editingProduct || isAdding) && (
          <ProductEditModal 
            product={editingProduct}
            categories={categories.filter(c => c !== 'All')}
            onSave={(p) => handleAdminAction('save', p)}
            onClose={() => {
              setEditingProduct(null)
              setIsAdding(false)
            }}
          />
        )}
        {toast && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-bounce ${
            toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        cartCount={cartCount} 
        onCartClick={() => setCartOpen(true)} 
        onTrackClick={() => setTrackingOpen(true)}
        isAdmin={isAdmin} 
        notice={notice} 
      />
      <Hero />
      <Steps />
      <ProductList 
        products={products}
        categories={categories}
        cart={cart} 
        onAdd={addToCart} 
        onRemove={removeFromCart}
        isAdmin={isAdmin} // Pass isAdmin to show edit/delete buttons if logged in
        onAdminAction={handleAdminAction}
        loading={loading}
      />
      <Footer 
        isAdmin={isAdmin} 
        onLogout={handleLogout}
      />

      {trackingOpen && (
        <OrderTracking 
          orders={orders} 
          onClose={() => setTrackingOpen(false)} 
          onRefresh={fetchOrders}
        />
      )}
      
      {cartOpen && (
        <Cart
          cart={cart}
          products={products}
          promoCodes={promoCodes}
          deliveryZones={deliveryZones}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onOrder={handleOrder}
        />
      )}

      {showSecret && (
        <SecretChallenge 
          onPass={() => {
            setPassedSecret(true)
            sessionStorage.setItem('passedSecret', 'true')
            setShowSecret(false)
            setShowLogin(true)
          }}
          onFail={() => {
            alert('Access Denied')
            window.location.href = '/'
          }}
        />
      )}

      {showLogin && (
        <AdminLogin 
          onLogin={handleLogin}
          onClose={() => {
            setShowLogin(false)
            window.location.href = '/'
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}
