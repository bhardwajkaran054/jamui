import { useState, useCallback } from 'react'
import type { Product, Cart } from '../types'
import { soundService } from '../services/soundService'

export function useCart() {
  const [cart, setCart] = useState<Cart>({})
  const [cartOpen, setCartOpen] = useState(false)

  const addToCart = useCallback((product: Product) => {
    setCart(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }))
    soundService.play('add')
  }, [])

  const removeFromCart = useCallback((product: Product) => {
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
  }, [])

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  return { cart, setCart, cartOpen, setCartOpen, addToCart, removeFromCart, cartCount }
}
