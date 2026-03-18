export default function Header({ cartCount, onCartClick }) {
  return (
    <header className="bg-green-800 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">🛒 Jamui Super Mart</h1>
          <p className="text-green-200 text-xs mt-0.5">Fast Home Delivery | Cash on Delivery</p>
        </div>
        <button
          onClick={onCartClick}
          className="relative bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <span className="text-lg">🛒</span>
          <span className="hidden sm:inline">Cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
