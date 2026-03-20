import { useState } from 'react'
import { X, Lock, Key, User } from 'lucide-react'
import { validateToken } from '../services/githubService'
import { apiFetch, BACKEND_MODE } from '../api'

export default function AdminLogin({ onLogin, onClose }) {
  const [token, setToken] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (BACKEND_MODE === 'github-backend') {
        // For GitHub Pages "Serverless" mode, we use a GitHub Personal Access Token
        const isValid = await validateToken(token)
        if (isValid) {
          localStorage.setItem('githubToken', token)
          onLogin(token)
        } else {
          setError('Invalid GitHub Token or no repository access')
        }
      } else {
        // For Local Node.js Backend mode, we use standard login
        const data = await apiFetch('/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        })
        localStorage.setItem('githubToken', data.token)
        onLogin(data.token)
      }
    } catch (err) {
      setError(err.message || 'Connection failed. Please check your credentials.')
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
          <h3 className="text-2xl font-bold text-gray-800">
            {BACKEND_MODE === 'github-backend' ? 'GitHub Admin' : 'Admin Login'}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {BACKEND_MODE === 'github-backend' ? 'Enter your Personal Access Token' : 'Enter your admin credentials'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center animate-pulse">
              {error}
            </div>
          )}

          {BACKEND_MODE === 'github-backend' ? (
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                autoFocus
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-gray-50/50"
                placeholder="ghp_xxxxxxxxxxxx"
                required
              />
            </div>
          ) : (
            <>
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
            </>
          )}

          {BACKEND_MODE === 'github-backend' && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Tip:</strong> Create a token at 
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="underline ml-1">GitHub Settings</a> 
                with <code>repo</code> scope to allow editing products.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Verify & Enter Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
