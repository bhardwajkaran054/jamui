import { useEffect } from 'react'
import { products } from '../data/products'

export default function Cart({ cart, onAdd, onRemove, onClose }) {
  const cartItems = products.filter(p => cart[p.id] > 0)
  const total = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const buildWhatsAppMsg = () => {
    let msg = 'Hello! I want to place an order:\n\n'
    cartItems.forEach(p => {
      msg += `${p.emoji} ${p.name} x${cart[p.id]} = \u20b9${p.price * cart[p.id]}\n`
    })
    msg += `\n*Total: \u20b9${total}*\n\nPlease confirm my order and delivery address.`
    return `https://wa.me/917856053987?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 bg-green-800 text-white">
          <h2 className="text-lg font-bold">🛒 Your Cart ({cartItems.length} items)</h2>
          <button onClick={onClose} className="hover:bg-green-700 p-2 rounded-lg transition-colors text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">🛒</p>
              <p className="text-gray-400 font-medium">Your cart is empty</p>
              <p className="text-gray-300 text-sm mt-1">Add some items to get started</p>
            </div>
          ) : (
            cartItems.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{p.name}</p>
                  <p className="text-green-700 text-sm font-bold">₹{p.price} x {cart[p.id]} = ₹{p.price * cart[p.id]}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onRemove(p)} className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-bold text-sm">-</button>
                  <span className="w-6 text-center font-bold text-sm">{cart[p.id]}</span>
                  <button onClick={() => onAdd(p)} className="w-7 h-7 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-bold text-sm">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-4 border-t bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-700">Total:</span>
              <span className="text-2xl font-extrabold text-green-700">₹{total}</span>
            </div>
            <a
              href={buildWhatsAppMsg()}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-bold py-3 rounded-xl transition-all shadow-lg"
            >
              📲 Order via WhatsApp
            </a>
            <p className="text-xs text-gray-400 text-center mt-2">Your order list will be pre-filled</p>
          </div>
        )}
      </div>
    </div>
  )
}
