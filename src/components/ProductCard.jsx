import { Plus, Minus, Edit2, Trash2, Tag } from 'lucide-react'

export default function ProductCard({ product, quantity, onAdd, onRemove, isAdmin, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-green-900/5 transition-all duration-500 flex flex-col group relative overflow-hidden">
      {isAdmin && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-2 group-hover:translate-y-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2.5 bg-white/90 backdrop-blur-sm text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white shadow-xl shadow-blue-900/10 border border-blue-50 transition-all active:scale-90"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if(confirm('Delete this product?')) onDelete(); }}
            className="p-2.5 bg-white/90 backdrop-blur-sm text-red-600 rounded-2xl hover:bg-red-600 hover:text-white shadow-xl shadow-red-900/10 border border-red-50 transition-all active:scale-90"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-6">
          <div className="bg-gray-50 w-24 h-24 sm:w-20 sm:h-20 flex items-center justify-center rounded-[1.5rem] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner overflow-hidden relative">
            {product.useImage && product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover rounded-[1.5rem]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.parentElement.innerHTML = `<span class="text-4xl">${product.emoji}</span>`;
                }}
              />
            ) : (
              <span className="text-4xl">{product.emoji}</span>
            )}
          </div>
          <span className="text-[10px] bg-green-50 text-green-700 font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-1 border border-green-100">
            <Tag className="w-2.5 h-2.5" />
            {product.category}
          </span>
        </div>
        
        <h3 className="font-bold text-gray-800 text-xl sm:text-lg mb-2 leading-tight group-hover:text-green-700 transition-colors">{product.name}</h3>
        
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-2xl font-black text-green-700">₹{product.price}</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">/ {product.unit}</span>
        </div>
        <div className="mt-3">
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${
            product.stock <= 0 ? 'bg-red-50 text-red-600 border-red-100' : 
            product.stock <= 5 ? 'bg-orange-50 text-orange-600 border-orange-100' : 
            'bg-green-50 text-green-600 border-green-100'
          }`}>
            {product.stock <= 0 ? 'Out of Stock' : `Stock: ${product.stock}`}
          </span>
        </div>
      </div>

      <div className="px-6 pb-6">
        {quantity === 0 ? (
          <button
            onClick={() => onAdd(product)}
            disabled={product.stock <= 0}
            className={`w-full py-4 rounded-[1.25rem] font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
              product.stock <= 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-green-700 hover:bg-green-800 active:scale-95 text-white shadow-green-900/10'
            }`}
          >
            <Plus className="w-4 h-4" /> {product.stock <= 0 ? 'Unavailable' : 'Add to Cart'}
          </button>
        ) : (
          <div className="flex items-center justify-between bg-gray-50 rounded-[1.25rem] p-1.5 border border-gray-100 shadow-inner">
            <button
              onClick={() => onRemove(product)}
              className="w-11 h-11 bg-white hover:bg-red-50 text-red-600 rounded-xl font-black text-xl transition-all shadow-sm active:scale-90"
            >
              -
            </button>
            <span className="font-black text-green-800 text-xl w-8 text-center">{quantity}</span>
            <button
              onClick={() => onAdd(product)}
              disabled={quantity >= product.stock}
              className={`w-11 h-11 rounded-xl font-black text-xl transition-all shadow-sm active:scale-90 ${
                quantity >= product.stock 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-green-50 text-green-700'
              }`}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
