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
import { CheckCircle, AlertCircle, X, Key } from 'lucide-react'
import { apiFetch } from './api'
import { soundService } from './services/soundService'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

import OrderTracking from './components/OrderTracking'
import { useProducts } from './hooks/useProducts'
import { useCart } from './hooks/useCart'
import { useAdminAuth } from './hooks/useAdminAuth'
import { useToast } from './hooks/useToast'

import type {
  Product,
  CartItem,
  Order,
  PromoCode,
  DeliveryZone,
  Notice,
  AdminActionType,
  AdminActionData
} from './types'

export default function App() {
  // Hooks
  const { products, loading, fetchProducts } = useProducts()
  const { cart, setCart, cartOpen, setCartOpen, addToCart, removeFromCart, cartCount } = useCart()
  const { token, passedSecret, handleLogin, handleLogout, handleSecretPass } = useAdminAuth()
  const { toast, setToast, showNotification } = useToast()

  // Local state
  const [categories, setCategories] = useState<string[]>(['All'])
  const [orders, setOrders] = useState<Order[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [notice, setNotice] = useState<Notice>({ text: '', active: false })
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Derived
  const isPathAdmin = window.location.hash.includes('/admin') || window.location.pathname.endsWith('/admin')

  // Effects
  useEffect(() => {
    fetchCategories()
    fetchOrders()
    fetchPromoCodes()
    fetchNotice()
    fetchDeliveryZones()
    if (token) setIsAdmin(true)
  }, [token, passedSecret])

  useEffect(() => {
    const handleHashChange = () => {
      const isPathAdminNow = window.location.hash.includes('/admin') || window.location.pathname.endsWith('/admin')
      if (isPathAdminNow) {
        if (!passedSecret) {
          setShowSecret(true)
        } else if (!token) {
          setShowLogin(true)
        }
      } else {
        setShowSecret(false)
        setShowLogin(false)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [token, passedSecret])

  // Data fetching
  const fetchCategories = async () => {
    try {
      const data = await apiFetch<string[]>('/categories')
      setCategories(data)
    } catch (err) {
      console.error('[API ERROR] Categories fetch failed:', err instanceof Error ? err.message : err)
    }
  }

  const fetchOrders = async () => {
    try {
      const data = await apiFetch<Order[]>('/orders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      setOrders(data)
    } catch (err) {
      console.error('[API ERROR] Orders fetch failed:', err instanceof Error ? err.message : err)
    }
  }

  const fetchPromoCodes = async () => {
    try {
      const data = await apiFetch<PromoCode[]>('/promo-codes')
      setPromoCodes(data)
    } catch (err) {
      console.error('[API ERROR] Promo codes fetch failed:', err instanceof Error ? err.message : err)
    }
  }

  const fetchNotice = async () => {
    try {
      const data = await apiFetch<Notice>('/notices')
      setNotice(data)
    } catch (err) {
      console.error('[API ERROR] Notices fetch failed:', err instanceof Error ? err.message : err)
    }
  }

  const fetchDeliveryZones = async () => {
    try {
      const data = await apiFetch<DeliveryZone[]>('/delivery-zones')
      setDeliveryZones(data)
    } catch (err) {
      console.error('[API ERROR] Delivery zones fetch failed:', err instanceof Error ? err.message : err)
    }
  }

  // Handlers
  const handleAdminAction = async (action: AdminActionType, data: AdminActionData) => {
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
        showNotification(err instanceof Error ? err.message : 'Delete failed', 'error')
      }
    } else if (action === 'deleteCategory') {
      const catName = data as string
      if (!confirm(`Are you sure you want to delete category "${catName}"? Products in this category will be moved to "Other".`)) return
      try {
        await apiFetch(`/categories/${encodeURIComponent(catName)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        showNotification('Category deleted successfully')
        await fetchProducts()
        await fetchCategories()
      } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Delete failed', 'error')
      }
    } else if (action === 'addCategory') {
      const catName = data as string
      try {
        await apiFetch('/categories', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name: catName })
        })
        showNotification('Category added successfully')
        await fetchCategories()
      } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Add category failed', 'error')
      }
    } else if (action === 'updateOrderStatus') {
      try {
        const orderId = data.id as number
        const status = data.status as string
        let updateData: Record<string, unknown> = { status }

        if (status === 'completed') {
          const hours = prompt('Estimated delivery in (hours):', '2')
          if (hours) {
            updateData.deliveryHours = parseInt(hours)
            updateData.deliveryMessage = `Your order will be delivered within ${hours} hour(s).`
          }
        } else if (status === 'rejected') {
          const reason = prompt('Reason for rejection:', 'Out of stock / Technical issue')
          if (reason) updateData.rejectionReason = reason
        }

        await apiFetch(`/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(updateData)
        })
        showNotification(`Order ${status} successfully`)
        await fetchOrders()
      } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Update failed', 'error')
      }
    } else if (action === 'deleteOrder') {
      if (!confirm('Delete this order record?')) return
      try {
        await apiFetch(`/orders/${data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        showNotification('Order deleted')
        await fetchOrders()
      } catch (err) {
        showNotification(err instanceof Error ? err.message : 'Delete failed', 'error')
      }
    } else if (action === 'edit') {
      setEditingProduct(data as Product)
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
        showNotification(err instanceof Error ? err.message : 'Save failed', 'error')
      }
    }
  }

  const handleLoginWrapper = (newToken: string) => {
    handleLogin(newToken)
    setIsAdmin(true)
    setShowLogin(false)
    showNotification('Welcome back, Admin!')
  }

  const handleLogoutWrapper = () => {
    handleLogout()
    setIsAdmin(false)
  }

  const handleOrder = async (cartItems: CartItem[], total: number, customerInfo: { name: string; phone: string }): Promise<boolean> => {
    try {
      const result = await apiFetch<{ order?: { id: number } }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerInfo,
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
      })

      setCart({})
      if (result && result.order) {
        setTrackingOrderId(`JM-${result.order.id.toString().slice(-6)}`)
        setTrackingOpen(true)
      }
      soundService.play('order')
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#166534', '#15803d', '#22c55e']
      })
      showNotification('Order placed successfully!')
      return true
    } catch (err) {
      console.error('[ORDER ERROR]', err)
      showNotification(err instanceof Error ? err.message : 'Order failed', 'error')
      return false
    }
  }

  // Loading state
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <div>
            <h2 className="text-2xl font-black text-gray-900">Jamui Super Mart</h2>
            <p className="text-gray-500 font-bold animate-pulse mt-1">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 max-w-md shadow-xl">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">No Products Available</h2>
          <p className="text-gray-500 font-medium mb-8 leading-relaxed">
            No products are currently available. Please check back later or contact support.
          </p>
        </div>
      </div>
    )
  }

  // Admin view
  if (isPathAdmin && isAdmin && token) {
    return (
      <>
        <AdminDashboard
          token={token}
          onLogout={handleLogoutWrapper}
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

  // Main customer view
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
        isAdmin={isAdmin}
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
          promoCodes={promoCodes}
          deliveryZones={deliveryZones}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onOrder={handleOrder}
        />
      )}

      {trackingOpen && (
        <OrderTracking
          initialOrderId={trackingOrderId}
          onClose={() => {
            setTrackingOpen(false)
            setTrackingOrderId(null)
          }}
        />
      )}

      {showSecret && (
        <SecretChallenge
          onPass={() => {
            handleSecretPass()
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
          onLogin={handleLoginWrapper}
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
