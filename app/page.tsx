'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
// import { redirect } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect to chat if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      window.location.href = '/chat'
    }
  }, [session, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else if (result?.ok) {
        // Force a hard redirect to chat
        window.location.href = '/chat'
      }
    } catch (_error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  if (session) {
    return null // Will redirect
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold text-emerald-400 mb-2">Gibby Chat</h1>
          <p className="text-zinc-400">
            Your private AI assistant powered by local LLMs
          </p>
        </div>

        {/* Login Form */}
        <div className="glassmorphism rounded-2xl p-8 border border-zinc-800/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Account Info */}
          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <p className="text-xs text-zinc-500 text-center mb-2">Demo Account</p>
            <div className="text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3 space-y-1">
              <div><strong>Email:</strong> demo@example.com</div>
              <div><strong>Password:</strong> demo1234</div>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🇩🇪</span>
              <span>German Server</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🇪🇺</span>
              <span>EU Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
