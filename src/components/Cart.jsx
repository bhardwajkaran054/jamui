import { useState, useEffect } from 'react'
import { ShoppingBag, Tag, Truck, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Cart({ cart, products, promoCodes = [], deliveryZones = [], onAdd, onRemove, onClose, onOrder }) {
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [selectedZone, setSelectedZone] = useState(deliveryZones[0] || null)
  
  // Quick Checkout States
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const cartItems = products.filter(p => cart[p.id] > 0)
  const subtotal = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0)
  const discount = appliedPromo ? appliedPromo.discount : 0
  const deliveryFee = selectedZone ? selectedZone.fee : 0
  const total = subtotal - discount + deliveryFee

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    // Load customer info from localStorage if available
    const savedName = localStorage.getItem('customerName')
    const savedPhone = localStorage.getItem('customerPhone')
    if (savedName) setCustomerName(savedName)
    if (savedPhone) setCustomerPhone(savedPhone)
    return () => { document.body.style.overflow = '' }
  }, [])

  const validateForm = () => {
    const errors = {}
    if (!customerName.trim()) errors.name = 'Name is required'
    if (!customerPhone.trim()) {
      errors.phone = 'Phone is required'
    } else if (!/^\d{10}$/.test(customerPhone.replace(/\D/g, '').slice(-10))) {
      errors.phone = 'Valid 10-digit number required'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleApplyPromo = () => {
    setPromoError('')
    const promo = promoCodes.find(p => p.code.toUpperCase() === promoCode.toUpperCase() && p.active)
    if (!promo) {
      setPromoError('Invalid or inactive promo code')
      setAppliedPromo(null)
    } else if (subtotal < promo.minOrder) {
      setPromoError(`Minimum order of ₹${promo.minOrder} required`)
      setAppliedPromo(null)
    } else {
      setAppliedPromo(promo)
      setPromoCode('')
    }
  }

  const handleOrderClick = async () => {
    if (!validateForm()) return

    // Save to localStorage for future quick checkout
    localStorage.setItem('customerName', customerName)
    localStorage.setItem('customerPhone', customerPhone)

    const success = await onOrder(cartItems, total, { name: customerName, phone: customerPhone })
    if (success) {
      let msg = `*NEW ORDER - JAMUI SUPER MART*\n\n`
      msg += `*Customer Details:*\n`
      msg += `👤 Name: ${customerName}\n`
      msg += `📞 Phone: ${customerPhone}\n\n`
      msg += `*Order Summary:*\n`
      cartItems.forEach(p => {
        msg += `${p.emoji} ${p.name} x${cart[p.id]} = \u20b9${p.price * cart[p.id]}\n`
      })
      msg += `\n--------------------------\n`
      msg += `*Subtotal:* \u20b9${subtotal}\n`
      if (appliedPromo) msg += `*Promo (${appliedPromo.code}):* -\u20b9${discount}\n`
      if (selectedZone) msg += `*Delivery (${selectedZone.name}):* +\u20b9${deliveryFee}\n`
      msg += `*Final Total: \u20b9${total}*\n`
      msg += `--------------------------\n\n`
      msg += `Please confirm my order and delivery address.`
      
      window.open(`https://wa.me/916202989990?text=${encodeURIComponent(msg)}`, '_blank')
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {cartItems.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-6 grayscale opacity-20">🛒</div>
              <p className="text-gray-400 font-bold text-lg">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-2 px-8">Add some fresh groceries to see them here!</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items in Cart</p>
                {cartItems.map(p => (
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
                ))}
              </div>

              {/* Promo Code Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Promo Code</p>
                {appliedPromo ? (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-600 p-2 rounded-lg text-white">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-green-700 uppercase tracking-widest">{appliedPromo.code}</p>
                        <p className="text-[10px] text-green-600 font-bold">₹{appliedPromo.discount} OFF Applied</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAppliedPromo(null)}
                      className="text-[10px] font-black text-red-500 uppercase hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter Code (e.g. WELCOME10)"
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none uppercase"
                      />
                      <button 
                        onClick={handleApplyPromo}
                        className="bg-gray-900 text-white px-4 py-3 rounded-xl text-xs font-black uppercase hover:bg-black transition-all"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {promoError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Checkout Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quick Checkout Details</p>
                <div className="space-y-3">
                  <div>
                    <input 
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Full Name"
                      className={`w-full bg-white border ${formErrors.name ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none`}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <input 
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="WhatsApp Phone Number"
                      className={`w-full bg-white border ${formErrors.phone ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none`}
                    />
                    {formErrors.phone && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{formErrors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery Zone Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Zone</p>
                <div className="grid gap-2">
                  {deliveryZones.map(zone => (
                    <button
                      key={zone.name}
                      onClick={() => setSelectedZone(zone)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                        selectedZone?.name === zone.name 
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' 
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className={`w-5 h-5 ${selectedZone?.name === zone.name ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <p className={`text-sm font-black ${selectedZone?.name === zone.name ? 'text-blue-700' : 'text-gray-700'}`}>{zone.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Delivery in 30-60 mins</p>
                        </div>
                      </div>
                      <span className={`font-black ${selectedZone?.name === zone.name ? 'text-blue-600' : 'text-gray-400'}`}>₹{zone.fee}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 border-t bg-white space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold text-gray-400">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between items-center text-sm font-bold text-green-600">
                  <span>Promo Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-blue-600">
                <span>Delivery Fee</span>
                <span>+₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-black text-gray-500 uppercase tracking-widest text-xs">Total Amount</span>
                <span className="text-3xl font-black text-green-700">₹{total}</span>
              </div>
            </div>
            
            <button
              onClick={handleOrderClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-center font-black py-5 rounded-2xl transition-all shadow-xl shadow-green-200 active:scale-95 flex items-center justify-center gap-3"
            >
              📲 Checkout on WhatsApp
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Professional Delivery Services
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
