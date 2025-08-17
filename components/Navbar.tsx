'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SecurityBadges from './SecurityBadges'

export default function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!session?.user) return '?'
    if (session.user.name) {
      return session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return session.user.email?.[0].toUpperCase() || '?'
  }

  if (status === 'loading') {
    return (
      <nav className="glassmorphism border-b border-zinc-800/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-emerald-400">Gibby Chat</h1>
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </nav>
    )
  }

  if (!session) {
    return (
      <nav className="glassmorphism border-b border-zinc-800/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-emerald-400">Gibby Chat</h1>
            <div className="text-sm text-zinc-400">Private AI Chat Application</div>
          </div>
          <div className="hidden md:block">
            <SecurityBadges />
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="glassmorphism border-b border-zinc-800/50 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <h1 className="text-xl font-bold text-emerald-400">Gibby Chat</h1>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          </Link>

          <div className="hidden md:block">
            <SecurityBadges />
          </div>
        </div>

        {/* Right side - Chat link and User Avatar Dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              pathname === '/chat' 
                ? 'text-emerald-400 bg-emerald-900/20' 
                : 'text-zinc-300 hover:text-emerald-300 hover:bg-emerald-900/20'
            }`}
          >
            Chat
          </Link>
          
          {/* User Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-800/50 transition-colors"
            aria-label="User menu"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg">
              {getUserInitials()}
            </div>
            
            {/* Dropdown Arrow */}
            <svg 
              className={`w-4 h-4 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-medium">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">
                      {session.user?.name || 'User'}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {session.user?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  href="/account"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Settings
                </Link>
                
                <Link
                  href="/chat"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Back to Chat
                </Link>
              </div>

              {/* Sign Out */}
              <div className="border-t border-zinc-800">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    signOut()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </nav>
  )
}