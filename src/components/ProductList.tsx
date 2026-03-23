import { useState } from 'react'
import { Search, Filter, ArrowUpDown, ChevronDown, ShoppingBag, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ProductCard from './ProductCard'
import type { ProductListProps } from '../types'

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

export default function ProductList({ products, categories, cart, onAdd, onRemove, isAdmin, onAdminAction, loading }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'none' | 'price-low' | 'price-high' | 'name'>('none')
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
                  {([
                    { id: 'none' as const, label: 'Recommended', icon: ShoppingBag },
                    { id: 'price-low' as const, label: 'Price: Low to High', icon: ArrowUpDown },
                    { id: 'price-high' as const, label: 'Price: High to Low', icon: ArrowUpDown },
                    { id: 'name' as const, label: 'Alphabetical', icon: ArrowUpDown }
                  ]).map(sort => (
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
            >
              <ProductCard
                product={product}
                quantity={cart[product.id] || 0}
                onAdd={onAdd}
                onRemove={onRemove}
                isAdmin={isAdmin}
                onEdit={() => onAdminAction('edit', product)}
                onDelete={() => onAdminAction('delete', product)}
              />
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
