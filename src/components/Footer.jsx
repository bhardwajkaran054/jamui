export default function Footer() {
  return (
    <footer className="bg-green-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-3">🛒 Jamui Super Mart</h3>
            <p className="text-green-300 text-sm leading-relaxed">
              Your trusted local grocery store. Fresh products at the best prices, delivered to your doorstep.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-green-200">Contact Us</h4>
            <div className="space-y-2 text-sm text-green-300">
              <p>📲 WhatsApp: 7856053987</p>
              <p>📍 Jamui, Bihar, India</p>
              <p>⏰ Mon-Sun: 7AM - 9PM</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-green-200">Quick Order</h4>
            <a
              href="https://wa.me/917856053987"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-full transition-all text-sm"
            >
              📲 Order on WhatsApp
            </a>
            <div className="flex gap-3 mt-4">
              <span className="bg-green-800 text-green-200 text-xs px-3 py-1 rounded-full">🚚 Fast Delivery</span>
              <span className="bg-green-800 text-green-200 text-xs px-3 py-1 rounded-full">💵 Cash on Delivery</span>
            </div>
          </div>
        </div>
        <div className="border-t border-green-800 pt-6 text-center text-green-400 text-sm">
          <p>© {new Date().getFullYear()} Jamui Super Mart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
