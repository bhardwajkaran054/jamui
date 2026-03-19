export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-green-900 to-green-700 text-white text-center py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-3">🌿 Fresh Groceries Delivered</p>
        <h2 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
          Order Your Groceries<br />
          <span className="text-orange-400">Online!</span>
        </h2>
        <p className="text-green-200 text-lg mb-8 max-w-xl mx-auto">
          Easy & Fast Delivery at Your Doorstep — Same Day Delivery Available
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/916202989990"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-full text-lg transition-all shadow-xl hover:scale-105"
          >
            📲 Order on WhatsApp
          </a>
          <a
            href="#products"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold px-8 py-3 rounded-full text-lg transition-all"
          >
            📋 View Price List
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-12 text-center">
          <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-3">
            <p className="text-2xl font-bold">15+</p>
            <p className="text-green-200 text-xs">Products</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-3">
            <p className="text-2xl font-bold">★ 4.9</p>
            <p className="text-green-200 text-xs">Rating</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-3">
            <p className="text-2xl font-bold">COD</p>
            <p className="text-green-200 text-xs">Cash on Delivery</p>
          </div>
        </div>
      </div>
    </section>
  )
}
