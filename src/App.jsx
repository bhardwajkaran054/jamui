import { useState, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Steps from './components/Steps'
import ProductList from './components/ProductList'
import Cart from './components/Cart'
import Footer from './components/Footer'
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
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
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

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    if (token) setIsAdmin(true)

    // Secret /admin path detection
    const isPathAdmin = window.location.pathname.endsWith('/admin')
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
  }, [token, passedSecret])

  const showNotification = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/products')
      setProducts(data)
    } catch (err) {
      console.error('[API ERROR] Products fetch failed:', err.message)
      showNotification(`API Error: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/categories')
      setCategories(data)
    } catch (err) {
      console.error('[API ERROR] Categories fetch failed:', err.message)
    }
  }

  const handleAdminAction = async (action, data) => {
    if (action === 'delete') {
      if (!confirm('Are you sure you want to delete this product?')) return
      try {
        await apiFetch(`/products/${data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
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
          headers: { 'Authorization': `Bearer ${token}` }
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
          headers: { 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: data })
        })
        showNotification('Category added successfully')
        await fetchCategories()
      } catch (err) {
        showNotification(err.message || 'Add category failed', 'error')
      }
    } else if (action === 'edit') {
      setEditingProduct(data)
    } else if (action === 'add') {
      setIsAdding(true)
    } else if (action === 'save') {
      try {
        await apiFetch('/products', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
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
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('githubToken')
    sessionStorage.removeItem('passedSecret')
    setPassedSecret(false)
    setIsAdmin(false)
    window.location.href = '/'
  }

  const handleOrder = async (cartItems, total) => {
    try {
      // Attempt to save order record in GitHub Backend (Requires Token)
      // Since public users don't have tokens, this will fail.
      // We wrap it in a try-catch to allow the WhatsApp redirect even if saving fails.
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ 
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: cart[item.id],
            emoji: item.emoji,
            category: item.category
          })), 
          total 
        })
      }).catch(err => {
        console.warn('[ORDER] Could not save record to GitHub (Public access)', err.message);
        // We continue anyway so the customer can still order via WhatsApp
      })

      setCart({})
      soundService.play('order')
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#166534', '#15803d', '#22c55e']
      })
      showNotification('Order ready! Redirecting to WhatsApp...')
      return true
    } catch (err) {
      // This catch is for any critical logic errors
      console.error('[ORDER ERROR]', err);
      return true // Still return true to allow WhatsApp flow
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

  // Show loading screen if we have no products yet
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

  // If we are in admin mode and logged in, show the full dashboard
  if (window.location.pathname === '/admin' && isAdmin && token) {
    return (
      <>
        <AdminDashboard 
          token={token}
          onLogout={handleLogout}
          onAdminAction={handleAdminAction}
          products={products}
          categories={categories}
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
      <Header cartCount={cartCount} onCartClick={() => setCartOpen(true)} isAdmin={isAdmin} />
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
      
      {cartOpen && (
        <Cart
          cart={cart}
          products={products}
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
