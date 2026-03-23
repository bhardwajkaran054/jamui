import { useState, useEffect } from 'react'
import { X, Package, Tag, Hash, LayoutGrid, Smile, ShoppingBag } from 'lucide-react'
import type { ProductEditModalProps } from '../types'

interface FormData {
  name: string
  price: string
  unit: string
  category: string
  emoji: string
  image?: string
  useImage: boolean
  stock: number
}

export default function ProductEditModal({ product, categories, onSave, onClose }: ProductEditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    unit: '',
    category: '',
    emoji: '🫘',
    image: '',
    useImage: false,
    stock: 0
  })

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        price: product.price.toString(),
        stock: product.stock || 0,
        useImage: !!product.image
      })
    }
  }, [product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(String(formData.stock)),
      image: formData.useImage ? formData.image : ''
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border border-gray-100 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="mb-8">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-xl">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            {product ? 'Edit Product' : 'New Product'}
          </h3>
          <p className="text-gray-500 text-sm mt-1">Update inventory details for Jamui Super Mart</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Tag className="w-3 h-3" /> Product Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50 font-bold text-gray-700"
                placeholder="e.g. Premium Basmati Rice"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50 font-black text-green-700 text-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <ShoppingBag className="w-3 h-3" /> Available Stock
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50 font-black text-orange-600 text-lg"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  ⚖️ Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50 font-bold"
                  placeholder="e.g. 1kg"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Media Type
                </label>
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, useImage: false })}
                    className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${!formData.useImage ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Icon
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, useImage: true })}
                    className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${formData.useImage ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Photo
                  </button>
                </div>
              </div>
            </div>

            <div className="animate-in slide-in-from-top-2 duration-200">
              {formData.useImage ? (
                <div className="space-y-2">
                  <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    🖼️ Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-blue-50/10 font-medium"
                    placeholder="https://example.com/photo.jpg"
                    required={formData.useImage}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                    <Smile className="w-3 h-3" /> Icon Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all bg-orange-50/10 text-center text-3xl"
                    placeholder="🫘"
                    required={!formData.useImage}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> Category
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50 font-bold"
                required
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="new" className="text-green-600 font-bold">+ Add New</option>
              </select>
            </div>

            {formData.category === 'new' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="text-xs font-black text-green-600 uppercase tracking-widest mb-2">New Category Name</label>
                <input
                  type="text"
                  placeholder="Type new category..."
                  className="w-full border-2 border-green-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-green-50/30 font-bold"
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-4 rounded-2xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-green-200 active:scale-95"
            >
              {product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
