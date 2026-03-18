export default function ProductCard({ product, quantity, onAdd, onRemove }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl">{product.emoji}</span>
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>
        <h3 className="font-semibold text-gray-800 text-sm mb-1 leading-tight">{product.name}</h3>
        <p className="text-xl font-extrabold text-green-700">₹{product.price}</p>
        <p className="text-xs text-gray-400">per {product.unit}</p>
      </div>
      <div className="px-4 pb-4">
        {quantity === 0 ? (
          <button
            onClick={() => onAdd(product)}
            className="w-full bg-green-700 hover:bg-green-800 active:scale-95 text-white py-2 rounded-xl font-semibold text-sm transition-all"
          >
            + Add to Cart
          </button>
        ) : (
          <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-1.5">
            <button
              onClick={() => onRemove(product)}
              className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-bold text-lg transition-colors"
            >
              -
            </button>
            <span className="font-bold text-green-800 text-lg w-8 text-center">{quantity}</span>
            <button
              onClick={() => onAdd(product)}
              className="w-8 h-8 bg-green-200 hover:bg-green-300 text-green-800 rounded-lg font-bold text-lg transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
