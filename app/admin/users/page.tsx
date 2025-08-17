'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  _count: {
    conversations: number
  }
}

export default function UserManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  })

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 403) {
        router.push('/chat')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
      return
    }
    fetchUsers()
  }, [session, status, router, fetchUsers])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user')
      }
      
      setUsers([data, ...users])
      setShowAddForm(false)
      setNewUser({ email: '', password: '', name: '', role: 'user' })
      setSuccess(`User ${data.email} created successfully!`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete ${userEmail}?`)) return
    
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error('Failed to delete user')
      
      setUsers(users.filter(u => u.id !== userId))
      setSuccess(`User ${userEmail} deleted successfully!`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError('Failed to delete user')
      setTimeout(() => setError(''), 5000)
      console.error(err)
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'superuser' ? 'user' : 'superuser'
    
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      
      if (!res.ok) throw new Error('Failed to update role')
      
      const updatedUser = await res.json()
      setUsers(users.map(u => u.id === userId ? { ...u, role: updatedUser.role } : u))
      setSuccess(`Role updated to ${newRole} successfully!`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError('Failed to update role')
      setTimeout(() => setError(''), 5000)
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-emerald-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">User Management</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-600/30 rounded-lg text-red-400 animate-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-600/30 rounded-lg text-emerald-400 animate-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddUser} className="mb-8 p-6 glassmorphism rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-emerald-400">Add New User</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <input
                type="text"
                placeholder="Name (optional)"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg focus:outline-none focus:border-emerald-600"
              >
                <option value="user">User</option>
                <option value="superuser">Superuser</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </form>
        )}

        <div className="glassmorphism rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Conversations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.email}
                    {user.id === session?.user?.id && (
                      <span className="ml-2 text-xs text-emerald-400">(You)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                    {user.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'superuser' 
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                    {user._count.conversations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        disabled={user.id === session?.user?.id}
                        className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Toggle Role
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={user.id === session?.user?.id}
                        className="text-xs px-3 py-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}