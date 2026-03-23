import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import type { Product, ProductsResponse } from '../types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiFetch<ProductsResponse | { products: Product[] }>('/products')

      let productData: Product[] = []
      if (data && 'products' in data) {
        productData = data.products
      } else if (Array.isArray(data)) {
        productData = data as Product[]
      }

      setProducts(productData)
    } catch (err) {
      console.error('[API ERROR] Products fetch failed:', err instanceof Error ? err.message : err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()

    const pollInterval = setInterval(fetchProducts, 30000)
    return () => clearInterval(pollInterval)
  }, [fetchProducts])

  return { products, loading, fetchProducts }
}
