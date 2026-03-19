import { useEffect } from 'react'

export default function Cart({ cart, products, onAdd, onRemove, onClose, onOrder }) {
  const cartItems = products.filter(p => cart[p.id] > 0)
  const total = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleOrderClick = async () => {
    const success = await onOrder(cartItems, total)
    if (success) {
      let msg = 'Hello! I want to place an order:\n\n'
      cartItems.forEach(p => {
        msg += `${p.emoji} ${p.name} x${cart[p.id]} = \u20b9${p.price * cart[p.id]}\n`
      })
      msg += `\n*Total: \u20b9${total}*\n\nPlease confirm my order and delivery address.`
      window.open(`https://wa.me/917856053987?text=${encodeURIComponent(msg)}`, '_blank')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 bg-green-800 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">🛒 Your Cart <span className="bg-green-700 px-2 py-0.5 rounded-lg text-sm">{cartItems.length}</span></h2>
          <button onClick={onClose} className="hover:bg-green-700 p-2 rounded-xl transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
          {cartItems.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-6 grayscale opacity-20">🛒</div>
              <p className="text-gray-400 font-bold text-lg">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-2 px-8">Add some fresh groceries to see them here!</p>
            </div>
          ) : (
            cartItems.map(p => (
              <div key={p.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 group">
                <div className="bg-gray-50 w-14 h-14 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform overflow-hidden">
                  {p.image ? (
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/100?text=' + encodeURIComponent(p.emoji);
                      }}
                    />
                  ) : (
                    <span className="text-3xl">{p.emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{p.name}</p>
                  <p className="text-green-700 font-black">₹{p.price} <span className="text-xs text-gray-400 font-normal ml-1">x {cart[p.id]}</span></p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => onRemove(p)} className="w-8 h-8 bg-white hover:bg-red-50 text-red-600 rounded-lg font-black shadow-sm transition-all">-</button>
                  <span className="w-6 text-center font-black text-sm text-gray-700">{cart[p.id]}</span>
                  <button onClick={() => onAdd(p)} className="w-8 h-8 bg-white hover:bg-green-50 text-green-700 rounded-lg font-black shadow-sm transition-all">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 border-t bg-white space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Estimated Total</span>
              <span className="text-3xl font-black text-green-700">₹{total}</span>
            </div>
            <button
              onClick={handleOrderClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-center font-black py-5 rounded-2xl transition-all shadow-xl shadow-green-200 active:scale-95 flex items-center justify-center gap-3"
            >
              📲 Checkout on WhatsApp
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Secure order processing
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
