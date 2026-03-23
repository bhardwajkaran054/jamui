import { useState, useCallback } from 'react'
import type { Toast } from '../types'

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return { toast, setToast, showNotification }
}
