import { useState } from 'react'
import { X, Lock, User } from 'lucide-react'
import { apiFetch } from '../api'
import type { AdminLoginProps } from '../types'
import type { LoginResponse } from '../types'

export default function AdminLogin({ onLogin, onClose }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiFetch<LoginResponse>('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
      sessionStorage.setItem('jamuiToken', data.token)
      onLogin(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative border border-gray-100">
        <button
          onClick={() => {
            window.location.hash = ''
            onClose()
          }}
          className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="text-center mb-8">
          <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Admin Login</h3>
          <p className="text-gray-500 text-sm mt-1">Enter your admin credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center animate-pulse">
              {error}
            </div>
          )}

          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50"
              placeholder="Username"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50"
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
