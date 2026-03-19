const steps = [
  { num: '1', icon: '📝', title: 'Send Your Order', desc: 'Browse products and build your order list' },
  { num: '2', icon: '📲', title: 'WhatsApp Us', desc: 'Send your list to 7856053987 on WhatsApp' },
  { num: '3', icon: '🚚', title: 'Get Delivery', desc: 'We deliver fresh groceries to your doorstep' },
]

export default function Steps() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-2">Simple Process</p>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-12">How To Order?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{s.icon}</div>
                <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 text-gray-300 text-2xl z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
