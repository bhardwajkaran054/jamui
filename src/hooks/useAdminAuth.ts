import { useState, useCallback } from 'react'

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('jamuiToken')
    } catch {
      return null
    }
  })
  const [passedSecret, setPassedSecret] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('passedSecret') === 'true'
    } catch {
      return false
    }
  })

  const handleLogin = useCallback((newToken: string) => {
    setToken(newToken)
    sessionStorage.setItem('jamuiToken', newToken)
  }, [])

  const handleLogout = useCallback(() => {
    setToken(null)
    sessionStorage.removeItem('jamuiToken')
    sessionStorage.removeItem('passedSecret')
    setPassedSecret(false)
    window.location.hash = ''
  }, [])

  const handleSecretPass = useCallback(() => {
    setPassedSecret(true)
    sessionStorage.setItem('passedSecret', 'true')
  }, [])

  return { token, passedSecret, handleLogin, handleLogout, handleSecretPass }
}
