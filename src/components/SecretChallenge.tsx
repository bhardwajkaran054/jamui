import { useState } from 'react'
import { ShieldAlert, Key } from 'lucide-react'
import type { SecretChallengeProps } from '../types'

export default function SecretChallenge({ onPass, onFail }: SecretChallengeProps) {
  const [code, setCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code === 'a2Jjb2Rl') {
      onPass()
    } else {
      onFail()
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl text-center">
        <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Restricted Area</h2>
        <p className="text-gray-500 mb-8 font-medium">Enter the base64 access code to proceed</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-2xl pl-14 pr-5 py-4 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all bg-gray-50 font-mono text-center tracking-widest text-lg"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gray-900 hover:bg-black text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95"
          >
            VERIFY IDENTITY
          </button>
        </form>
      </div>
    </div>
  )
}
