'use client'

import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Folder, Conversation, FOLDER_COLORS } from '@/types'
import { logger } from '@/lib/logger'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void
  currentConversationId?: string
  onNewConversation: () => void
  currentFolderId?: string
  onSelectFolder?: (folderId: string | null) => void
  refreshTrigger?: number
}

function ConversationList({ 
  onSelectConversation, 
  currentConversationId, 
  onNewConversation,
  currentFolderId: _currentFolderId,
  onSelectFolder: _onSelectFolder,
  refreshTrigger
}: ConversationListProps) {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const { unreadConversations, markRead } = useUnreadMessages()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [draggingConversationId, setDraggingConversationId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  
  // Folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLORS[0].value)
  const [newFolderPrivate, setNewFolderPrivate] = useState(false)
  const [newFolderPassword, setNewFolderPassword] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [editFolderColor, setEditFolderColor] = useState<string>(FOLDER_COLORS[0].value)
  const [editFolderPrivate, setEditFolderPrivate] = useState(false)
  const [editFolderCurrentPassword, setEditFolderCurrentPassword] = useState('')
  const [editFolderNewPassword, setEditFolderNewPassword] = useState('')
  const [editFolderWasPrivate, setEditFolderWasPrivate] = useState(false)
  const [folderPasswords, setFolderPasswords] = useState<{ [key: string]: string }>({})
  const [passwordPrompt, setPasswordPrompt] = useState<{ folderId: string; name: string } | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  
  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean
    conversationId?: string
    conversationTitle?: string
  }>({ show: false })
  
  // Track expanded folders - start with all folders collapsed
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (error) {
      logger.error('Failed to fetch conversations', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders')
      if (res.ok) {
        const data = await res.json()
        setFolders(data)
        // Start with all folders collapsed
        setExpandedFolders(new Set())
      }
    } catch (error) {
      logger.error('Failed to fetch folders', error)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchConversations()
      fetchFolders()
    }
  }, [session, fetchConversations, fetchFolders])

  // Refresh when a new conversation is created
  useEffect(() => {
    if (currentConversationId && refreshTrigger) {
      fetchConversations()
    }
  }, [currentConversationId, refreshTrigger, fetchConversations])

  // Clear unread when selecting a conversation
  const handleSelectConversation = useCallback((id: string) => {
    markRead(id)
    onSelectConversation(id)
  }, [onSelectConversation, markRead])

  // Group conversations by folder
  const groupedConversations = useMemo(() => {
    const grouped: { [key: string]: Conversation[] } = {
      unfiled: []
    }

    folders.forEach(folder => {
      grouped[folder.id] = []
    })

    conversations.forEach(conv => {
      if (conv.folderId && grouped[conv.folderId]) {
        grouped[conv.folderId].push(conv)
      } else {
        grouped.unfiled.push(conv)
      }
    })

    return grouped
  }, [conversations, folders])

  // Folder CRUD operations
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return
    if (newFolderPrivate && !newFolderPassword) {
      alert('Please enter a password for the private folder')
      return
    }

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFolderName.trim(), 
          color: selectedColor,
          isPrivate: newFolderPrivate,
          password: newFolderPrivate ? newFolderPassword : undefined
        })
      })
      
      if (res.ok) {
        const newFolder = await res.json()
        setFolders(prev => [...prev, newFolder])
        // Don't auto-expand new folders
        setNewFolderName('')
        setIsCreatingFolder(false)
        setSelectedColor(FOLDER_COLORS[0].value)
        setNewFolderPrivate(false)
        setNewFolderPassword('')
      }
    } catch (error) {
      logger.error('Failed to create folder', error)
    }
  }, [newFolderName, selectedColor, newFolderPrivate, newFolderPassword])

  const handleUpdateFolder = useCallback(async (id: string) => {
    if (!editFolderName.trim()) return

    // Validate password requirements
    if (editFolderWasPrivate && editFolderPrivate && !editFolderCurrentPassword) {
      alert('Please enter the current password to change folder settings')
      return
    }
    
    if (editFolderPrivate && !editFolderWasPrivate && !editFolderNewPassword) {
      alert('Please enter a password for the private folder')
      return
    }

    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editFolderName.trim(),
          color: editFolderColor,
          isPrivate: editFolderPrivate,
          currentPassword: editFolderWasPrivate ? editFolderCurrentPassword : undefined,
          password: editFolderPrivate ? editFolderNewPassword : undefined
        })
      })
      
      if (res.ok) {
        const updatedFolder = await res.json()
        setFolders(prev => prev.map(f => 
          f.id === id ? updatedFolder : f
        ))
        setEditingFolderId(null)
        setEditFolderName('')
        setEditFolderColor(FOLDER_COLORS[0].value)
        setEditFolderPrivate(false)
        setEditFolderCurrentPassword('')
        setEditFolderNewPassword('')
        setEditFolderWasPrivate(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update folder')
      }
    } catch (error) {
      logger.error('Failed to update folder', error)
      alert('Failed to update folder')
    }
  }, [editFolderName, editFolderColor, editFolderPrivate, editFolderCurrentPassword, editFolderNewPassword, editFolderWasPrivate])

  const handleDeleteFolder = useCallback(async (id: string) => {
    if (!confirm('Delete this folder? Conversations will be moved to unfiled.')) return

    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setFolders(prev => prev.filter(f => f.id !== id))
        // Move conversations from deleted folder to unfiled
        setConversations(prev => prev.map(c => 
          c.folderId === id ? { ...c, folderId: null } : c
        ))
      }
    } catch (error) {
      logger.error('Failed to delete folder', error)
    }
  }, [])

  // Conversation operations
  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setConversations(conversations.filter(c => c.id !== id))
        if (currentConversationId === id) {
          onNewConversation()
        }
        setDeleteConfirmation({ show: false })
      }
    } catch (error) {
      logger.error('Failed to delete conversation', error)
    }
  }, [conversations, currentConversationId, onNewConversation])
  
  const showDeleteConfirmation = useCallback((id: string, title: string) => {
    setDeleteConfirmation({
      show: true,
      conversationId: id,
      conversationTitle: title
    })
  }, [])

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })

      if (res.ok) {
        setConversations(conversations.map(c => 
          c.id === id ? { ...c, title: newTitle.trim() } : c
        ))
        setEditingId(null)
      }
    } catch (error) {
      logger.error('Failed to rename conversation', error)
    }
  }, [conversations])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, conversationId: string) => {
    setDraggingConversationId(conversationId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    
    if (!draggingConversationId) return

    try {
      const res = await fetch(`/api/conversations/${draggingConversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      })

      if (res.ok) {
        setConversations(prev => prev.map(c => 
          c.id === draggingConversationId ? { ...c, folderId } : c
        ))
      }
    } catch (error) {
      logger.error('Failed to move conversation', error)
    } finally {
      setDraggingConversationId(null)
      setDragOverFolderId(null)
    }
  }, [draggingConversationId])

  const toggleFolder = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return

    // Check if folder is private and we don't have the password
    if (folder.isPrivate && !folderPasswords[folderId]) {
      setPasswordPrompt({ folderId, name: folder.name })
      return
    }

    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [folders, folderPasswords])

  // Verify folder password
  const verifyFolderPassword = useCallback(async () => {
    if (!passwordPrompt) return

    try {
      const res = await fetch(`/api/folders/${passwordPrompt.folderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      })

      const data = await res.json()
      if (data.valid) {
        setFolderPasswords(prev => ({ ...prev, [passwordPrompt.folderId]: passwordInput }))
        setExpandedFolders(prev => new Set(Array.from(prev).concat(passwordPrompt.folderId)))
        setPasswordPrompt(null)
        setPasswordInput('')
        setPasswordError(false)
      } else {
        setPasswordError(true)
      }
    } catch (error) {
      logger.error('Failed to verify folder password', error)
      setPasswordError(true)
    }
  }, [passwordPrompt, passwordInput])

  // Format date in Austrian German format
  const formatAustrianDate = (date: string | Date) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    // Today
    if (diffDays === 0) {
      if (diffMinutes < 1) return 'gerade eben'
      if (diffMinutes < 60) return `vor ${diffMinutes} Min.`
      if (diffHours === 1) return 'vor 1 Stunde'
      return `vor ${diffHours} Stunden`
    }
    
    // Yesterday
    if (diffDays === 1) return 'gestern'
    
    // This week
    if (diffDays < 7) {
      const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
      return weekdays[d.getDay()]
    }
    
    // This month
    if (diffDays < 30) {
      return `vor ${diffDays} Tagen`
    }
    
    // Older - Austrian format: DD.MM.YYYY
    return d.toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const renderConversation = (conversation: Conversation) => (
    <div
      key={conversation.id}
      draggable
      onDragStart={(e) => handleDragStart(e, conversation.id)}
      className={`group relative p-2.5 rounded-lg cursor-pointer transition-all ${
        currentConversationId === conversation.id
          ? 'bg-emerald-900/20 border border-emerald-600/30 shadow-sm'
          : 'md:hover:bg-zinc-800/30 border border-transparent md:hover:border-zinc-700/30 active:bg-zinc-800/40'
      } ${draggingConversationId === conversation.id ? 'opacity-50' : ''}`}
      onClick={() => handleSelectConversation(conversation.id)}
    >
      {editingId === conversation.id ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename(conversation.id, editTitle)
              } else if (e.key === 'Escape') {
                setEditingId(null)
                setEditTitle('')
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="text-sm font-medium text-zinc-200 truncate">
                {conversation.title}
              </h3>
              {unreadConversations.has(conversation.id) && (
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity max-md:!opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingId(conversation.id)
                  setEditTitle(conversation.title)
                }}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                title="Rename"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  showDeleteConfirmation(conversation.id, conversation.title)
                }}
                className="p-1 hover:bg-red-600/20 rounded text-zinc-400 hover:text-red-400"
                title="Delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {conversation._count?.messages || 0} Nachrichten
            </span>
            <span className="text-zinc-600">•</span>
            <span>{formatAustrianDate(conversation.updatedAt)}</span>
          </div>
        </>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="w-80 glassmorphism border-r border-zinc-800/50 p-4 flex flex-col">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded"></div>
          <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 h-full glassmorphism border-r border-zinc-800/50 flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50">
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          New Chat
        </button>
      </div>

      {/* Conversations and Folders */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Folder creation UI */}
        {isCreatingFolder && (
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 space-y-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !newFolderPrivate) handleCreateFolder()
                if (e.key === 'Escape') {
                  setIsCreatingFolder(false)
                  setNewFolderName('')
                  setNewFolderPrivate(false)
                  setNewFolderPassword('')
                }
              }}
              autoFocus
            />
            
            <div className="flex gap-1">
              {FOLDER_COLORS.slice(0, 8).map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-5 h-5 rounded transition-transform ${
                    selectedColor === color.value ? 'scale-125 ring-2 ring-zinc-600' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFolderPrivate}
                  onChange={(e) => setNewFolderPrivate(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-0"
                />
                <span className="text-xs text-zinc-400">Make folder private</span>
              </label>
              
              {newFolderPrivate && (
                <>
                  <div className="bg-amber-950/30 border border-amber-900/30 rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-xs text-amber-200/90 space-y-1">
                        <p className="font-semibold">🔐 Double Encryption & Security</p>
                        <p className="text-amber-300/70">This folder will be password-protected with military-grade encryption.</p>
                        <p className="text-red-400 font-semibold">⚠️ WARNING: Password cannot be recovered if forgotten!</p>
                      </div>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={newFolderPassword}
                    onChange={(e) => setNewFolderPassword(e.target.value)}
                    placeholder="Enter a strong password..."
                    className="w-full bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFolderPassword) handleCreateFolder()
                    }}
                  />
                </>
              )}
            </div>

            <div className="flex gap-1">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || (newFolderPrivate && !newFolderPassword)}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(false)
                  setNewFolderName('')
                  setNewFolderPrivate(false)
                  setNewFolderPassword('')
                }}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add folder button - styled like a folder */}
        {!isCreatingFolder && (
          <div
            onClick={() => setIsCreatingFolder(true)}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer md:hover:bg-zinc-800/30 active:bg-zinc-800/40"
          >
            {/* White folder icon */}
            <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            
            <span className="flex-1 text-sm font-medium text-zinc-400 uppercase tracking-wide">
              Neuer Ordner
            </span>
            
            <svg className="w-3 h-3 text-zinc-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity max-md:!opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )}

        {/* Folders with conversations */}
        {folders.map((folder) => (
          <div key={folder.id} className="space-y-1.5">
            <div
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer md:hover:bg-zinc-800/30 active:bg-zinc-800/40 ${
                dragOverFolderId === folder.id ? 'bg-zinc-800/50 ring-2 ring-emerald-600' : ''
              }`}
              onClick={() => toggleFolder(folder.id)}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverFolderId(folder.id)}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              {/* Folder icon with custom color */}
              <div className="relative">
                <svg 
                  className="w-5 h-5 flex-shrink-0" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  style={{ color: folder.color || '#10b981' }}
                >
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                {folder.isPrivate && (
                  <svg className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-amber-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {editingFolderId === folder.id ? (
                <div className="flex-1 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-3">
                    {/* Folder Name */}
                    <div>
                      <label className="text-xs text-zinc-400 font-medium mb-1 block">Folder Name</label>
                      <input
                        type="text"
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        className="w-full bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
                        placeholder="Enter folder name..."
                        autoFocus
                      />
                    </div>
                    
                    {/* Color Selection */}
                    <div>
                      <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Folder Color</label>
                      <div className="flex gap-2">
                        {FOLDER_COLORS.slice(0, 8).map((color) => (
                          <button
                            key={color.value}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditFolderColor(color.value)
                            }}
                            className={`w-6 h-6 rounded-full transition-all ${
                              editFolderColor === color.value 
                                ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' 
                                : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer bg-zinc-800/50 p-2 rounded-lg">
                        <input
                          type="checkbox"
                          checked={editFolderPrivate}
                          onChange={(e) => setEditFolderPrivate(e.target.checked)}
                          className="rounded border-zinc-600 bg-zinc-700 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-0"
                        />
                        <span className="text-sm text-zinc-300 font-medium">🔒 Make folder private</span>
                      </label>
                      
                      {editFolderPrivate && (
                        <div className="space-y-2 pl-2">
                          <div className="bg-amber-950/30 border border-amber-900/30 rounded-lg p-2.5">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-xs space-y-0.5">
                              <p className="text-amber-200/90 font-semibold">Double Encrypted Security</p>
                              <p className="text-amber-300/70">Military-grade encryption protects this folder</p>
                              <p className="text-red-400 font-semibold">⚠️ Password cannot be recovered if forgotten!</p>
                            </div>
                          </div>
                        </div>
                          
                          {editFolderWasPrivate && (
                            <div>
                              <label className="text-xs text-zinc-400 font-medium mb-1 block">Current Password (required)</label>
                              <input
                                type="password"
                                value={editFolderCurrentPassword}
                                onChange={(e) => setEditFolderCurrentPassword(e.target.value)}
                                placeholder="Enter current password..."
                                className="w-full bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                          )}
                          
                          <div>
                            <label className="text-xs text-zinc-400 font-medium mb-1 block">
                              {editFolderWasPrivate ? 'New Password (leave blank to keep current)' : 'Password'}
                            </label>
                            <input
                              type="password"
                              value={editFolderNewPassword}
                              onChange={(e) => setEditFolderNewPassword(e.target.value)}
                              placeholder={editFolderWasPrivate ? "Enter new password (optional)..." : "Enter password..."}
                              className="w-full bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateFolder(folder.id)
                        }}
                        className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingFolderId(null)
                          setEditFolderName('')
                          setEditFolderColor(FOLDER_COLORS[0].value)
                          setEditFolderPrivate(false)
                          setEditFolderCurrentPassword('')
                          setEditFolderNewPassword('')
                          setEditFolderWasPrivate(false)
                        }}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="flex-1 text-sm font-medium text-zinc-300">
                  {folder.name}
                </span>
              )}
              
              <span className="text-xs text-zinc-500 font-medium bg-zinc-800/50 px-1.5 py-0.5 rounded">
                {groupedConversations[folder.id]?.length || 0}
              </span>
              
              <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 max-md:!opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingFolderId(folder.id)
                    setEditFolderName(folder.name)
                    setEditFolderColor(folder.color || FOLDER_COLORS[0].value)
                    setEditFolderPrivate(folder.isPrivate || false)
                    setEditFolderWasPrivate(folder.isPrivate || false)
                    setEditFolderCurrentPassword('')
                    setEditFolderNewPassword('')
                  }}
                  className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                  title="Edit"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFolder(folder.id)
                  }}
                  className="p-0.5 hover:bg-red-600/20 rounded text-zinc-400 hover:text-red-400"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Show folder contents when expanded */}
            {expandedFolders.has(folder.id) && (
              <div className="space-y-1.5 ml-6 pl-3 border-l border-zinc-800/50">
                {groupedConversations[folder.id]?.map(renderConversation)}
              </div>
            )}
          </div>
        ))}

        {/* Unfiled conversations - No folder header, just conversations */}
        {groupedConversations.unfiled.length > 0 && (
          <div 
            className={`space-y-1.5 ${
              dragOverFolderId === 'unfiled' ? 'bg-zinc-800/20 rounded-lg p-2' : ''
            }`}
            onDragOver={handleDragOver}
            onDragEnter={() => setDragOverFolderId('unfiled')}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDrop(e, null)}
          >
            {groupedConversations.unfiled.map(renderConversation)}
          </div>
        )}

        {conversations.length === 0 && folders.length === 0 && (
          <div className="text-center text-zinc-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>No conversations yet</p>
            <p className="text-sm">Start a new chat to begin</p>
          </div>
        )}
      </div>
      
      {/* Password Prompt Modal */}
      {passwordPrompt && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-100">
                      Folder Password Required
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Enter password to access <span className="text-zinc-200 font-medium">&quot;{passwordPrompt.name}&quot;</span>
                    </p>
                  </div>
                </div>

                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value)
                      setPasswordError(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') verifyFolderPassword()
                      if (e.key === 'Escape') {
                        setPasswordPrompt(null)
                        setPasswordInput('')
                        setPasswordError(false)
                      }
                    }}
                    placeholder="Enter password..."
                    className={`w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded-lg border ${
                      passwordError ? 'border-red-600' : 'border-zinc-700 focus:border-emerald-600'
                    } focus:outline-none`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-xs text-red-400 mt-1">Incorrect password</p>
                  )}
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setPasswordPrompt(null)
                      setPasswordInput('')
                      setPasswordError(false)
                    }}
                    className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verifyFolderPassword}
                    disabled={!passwordInput}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Unlock
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
            {/* Modal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95">
              <div className="flex flex-col items-start gap-4">
                {/* Warning Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                    Chat unwiderruflich löschen?
                  </h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Sie sind dabei, den Chat <span className="text-zinc-200 font-medium">&quot;{deleteConfirmation.conversationTitle}&quot;</span> zu löschen.
                  </p>
                  <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-300">
                      <strong>⚠️ Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
                    </p>
                    <p className="text-xs text-red-400 mt-2">
                      Alle Nachrichten und Daten dieses Chats werden permanent von allen Servern und Speichermedien gelöscht und können nicht wiederhergestellt werden.
                    </p>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteConfirmation({ show: false })}
                      className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        if (deleteConfirmation.conversationId) {
                          handleDelete(deleteConfirmation.conversationId)
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(ConversationList)