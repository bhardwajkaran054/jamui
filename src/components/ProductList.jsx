import { useState } from 'react'
import { Search, Filter, ArrowUpDown, ChevronDown, ShoppingBag, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ProductSkeleton = () => (
  <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 animate-pulse">
    <div className="bg-gray-200 aspect-square rounded-2xl mb-4" />
    <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-4" />
    <div className="flex justify-between items-center pt-2">
      <div className="h-6 bg-gray-200 rounded-lg w-1/4" />
      <div className="h-10 bg-gray-200 rounded-xl w-1/3" />
    </div>
  </div>
)

export default function ProductList({ products, categories, cart, onAdd, onRemove, isAdmin, loading }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('none')
  const [showFilters, setShowFilters] = useState(false)

  const filteredProducts = products
    .filter(p => (selectedCategory === 'All' || p.category === selectedCategory))
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <section id="products" className="py-12 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="relative group flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            placeholder="Search fresh groceries..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border ${
              showFilters ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-600 hover:text-green-600'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-wrap gap-8">
              <div className="space-y-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                        selectedCategory === cat 
                          ? 'bg-green-100 text-green-700 shadow-sm' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Sort By</p>
                <div className="flex gap-2">
                  {[
                    { id: 'none', label: 'Recommended', icon: ShoppingBag },
                    { id: 'price-low', label: 'Price: Low to High', icon: ArrowUpDown },
                    { id: 'price-high', label: 'Price: High to Low', icon: ArrowUpDown },
                    { id: 'name', label: 'Alphabetical', icon: ArrowUpDown }
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => setSortBy(sort.id)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        sortBy === sort.id 
                          ? 'bg-green-100 text-green-700 shadow-sm' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <sort.icon className="w-4 h-4" />
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {filteredProducts.map(product => (
            <motion.div 
              key={product.id}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="bg-white rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:shadow-green-100/50 border border-gray-100 transition-all group relative overflow-hidden"
            >
              {product.stock <= 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                  <div className="bg-red-50 p-4 rounded-3xl mb-3">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-black text-lg">Out of Stock</p>
                  <p className="text-gray-500 text-sm font-medium">Coming back soon!</p>
                </div>
              )}

              <div className="bg-gray-50 aspect-square rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative overflow-hidden">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = `<span class="text-7xl">${product.emoji}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-7xl">{product.emoji}</span>
                )}
                {product.stock > 0 && product.stock <= 5 && (
                  <div className="absolute top-4 right-4 bg-orange-100 text-orange-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-orange-200 z-10">
                    <Info className="w-3 h-3" />
                    ONLY {product.stock} LEFT
                  </div>
                )}
              </div>
              
              <div className="space-y-1 mb-6">
                <p className="text-xs font-black text-green-600 uppercase tracking-widest">{product.category}</p>
                <h3 className="text-xl font-black text-gray-800 line-clamp-1">{product.name}</h3>
                <p className="text-sm font-bold text-gray-400">{product.unit}</p>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-gray-800">₹{product.price}</span>
                </div>
                
                {cart[product.id] ? (
                  <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl shadow-inner border border-gray-200/50">
                    <button 
                      onClick={() => onRemove(product)}
                      className="w-10 h-10 bg-white text-red-600 rounded-xl font-black shadow-sm hover:bg-red-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-gray-700">{cart[product.id]}</span>
                    <button 
                      onClick={() => onAdd(product)}
                      disabled={product.stock <= cart[product.id]}
                      className={`w-10 h-10 bg-white text-green-700 rounded-xl font-black shadow-sm transition-all flex items-center justify-center ${
                        product.stock <= cart[product.id] ? 'opacity-30 cursor-not-allowed' : 'hover:bg-green-50 hover:scale-105 active:scale-95'
                      }`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => onAdd(product)}
                    disabled={product.stock <= 0}
                    className={`px-6 py-3 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 transition-all flex items-center gap-2 group/btn ${
                      product.stock <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-green-700 hover:scale-105 active:scale-95 hover:shadow-green-200'
                    }`}
                  >
                    Add <ShoppingBag className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-sm"
        >
          <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 mb-2">No products found</h3>
          <p className="text-gray-400 font-bold">Try searching for something else or change category</p>
        </motion.div>
      )}
    </section>
  )
}
