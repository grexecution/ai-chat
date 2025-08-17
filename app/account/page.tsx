'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function AccountPage() {
  const { data: session, status, update } = useSession()
  const [displayName, setDisplayName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/')
    }
  }, [status])

  // Set initial display name
  useEffect(() => {
    if (session?.user?.name) {
      setDisplayName(session.user.name)
    }
  }, [session])

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      setMessage('Display name cannot be empty')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/account/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      })

      if (res.ok) {
        await update() // Refresh session
        setIsEditing(false)
        setMessage('Display name updated successfully')
        setMessageType('success')
      } else {
        const error = await res.text()
        setMessage(error || 'Failed to update display name')
        setMessageType('error')
      }
    } catch (_error) {
      setMessage('Failed to update display name')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setDisplayName(session?.user?.name || '')
    setIsEditing(false)
    setMessage('')
    setMessageType(null)
  }

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading account...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link 
            href="/chat"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
            title="Back to Chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-emerald-400">Account Settings</h1>
        </div>
        <p className="text-zinc-400">Manage your account information and preferences</p>
      </div>

      {/* Account Information */}
      <div className="space-y-6">
        {/* Display Name */}
        <div className="glassmorphism rounded-2xl p-6 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-100">Display Name</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none transition-colors"
                placeholder="Enter your display name"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSaveDisplayName}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-zinc-300 text-lg">{session.user?.name || 'Not set'}</div>
          )}
        </div>

        {/* Email */}
        <div className="glassmorphism rounded-2xl p-6 border border-zinc-800/50">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Email Address</h2>
          <div className="text-zinc-300 text-lg">{session.user?.email}</div>
          <p className="text-sm text-zinc-500 mt-2">Email cannot be changed</p>
        </div>

        {/* Security */}
        <div className="glassmorphism rounded-2xl p-6 border border-zinc-800/50">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>Password authentication enabled</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>Session encrypted with JWT</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>All data stored locally</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 mt-4">
            Password changes are not yet implemented in this demo version.
          </p>
        </div>

        {/* Server Information */}
        <div className="glassmorphism rounded-2xl p-6 border border-zinc-800/50">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Server Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇩🇪</span>
              <span className="text-zinc-300">German Server</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🇪🇺</span>
              <span className="text-zinc-300">EU Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-zinc-300">End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-zinc-300">No Data Sharing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg border ${
          messageType === 'success' 
            ? 'bg-emerald-900/20 border-emerald-600/30 text-emerald-300'
            : 'bg-red-900/20 border-red-600/30 text-red-300'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}