import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Steps from './components/Steps'
import ProductList from './components/ProductList'
import Cart from './components/Cart'
import Footer from './components/Footer'

export default function App() {
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)

  const addToCart = (product) => {
    setCart(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
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
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <Hero />
      <Steps />
      <ProductList cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
      <Footer />
      {cartOpen && (
        <Cart
          cart={cart}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  )
}
