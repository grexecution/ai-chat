'use client'

import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Folder, Conversation, FOLDER_COLORS, FOLDER_ICONS } from '@/types'
import { logger } from '@/lib/logger'

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void
  currentConversationId?: string
  onNewConversation: () => void
  currentFolderId?: string
  onSelectFolder?: (folderId: string | null) => void
}

function ConversationList({ 
  onSelectConversation, 
  currentConversationId, 
  onNewConversation,
  currentFolderId: _currentFolderId,
  onSelectFolder: _onSelectFolder
}: ConversationListProps) {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggingConversationId, setDraggingConversationId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  
  // Folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLORS[0].value)
  const [selectedIcon, setSelectedIcon] = useState<string>(FOLDER_ICONS[0])
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

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
        // Expand all folders by default
        setExpandedFolders(new Set(data.map((f: Folder) => f.id)))
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

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFolderName.trim(), 
          color: selectedColor, 
          icon: selectedIcon 
        })
      })
      
      if (res.ok) {
        const newFolder = await res.json()
        setFolders(prev => [...prev, newFolder])
        setExpandedFolders(prev => new Set(prev).add(newFolder.id))
        setNewFolderName('')
        setIsCreatingFolder(false)
        setSelectedColor(FOLDER_COLORS[0].value)
        setSelectedIcon(FOLDER_ICONS[0])
      }
    } catch (error) {
      logger.error('Failed to create folder', error)
    }
  }, [newFolderName, selectedColor, selectedIcon])

  const handleUpdateFolder = useCallback(async (id: string, name: string) => {
    if (!name.trim()) return

    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })
      
      if (res.ok) {
        setFolders(prev => prev.map(f => 
          f.id === id ? { ...f, name: name.trim() } : f
        ))
        setEditingFolderId(null)
        setEditFolderName('')
      }
    } catch (error) {
      logger.error('Failed to update folder', error)
    }
  }, [])

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
    if (!confirm('Delete this conversation?')) return

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setConversations(conversations.filter(c => c.id !== id))
        if (currentConversationId === id) {
          onNewConversation()
        }
      }
    } catch (error) {
      logger.error('Failed to delete conversation', error)
    }
  }, [conversations, currentConversationId, onNewConversation])

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

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  const renderConversation = (conversation: Conversation) => (
    <div
      key={conversation.id}
      draggable
      onDragStart={(e) => handleDragStart(e, conversation.id)}
      className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
        currentConversationId === conversation.id
          ? 'bg-emerald-900/30 border border-emerald-600/30'
          : 'hover:bg-zinc-800/50 border border-transparent'
      } ${draggingConversationId === conversation.id ? 'opacity-50' : ''}`}
      onClick={() => onSelectConversation(conversation.id)}
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
            <h3 className="font-medium text-zinc-100 truncate pr-2">
              {conversation.title}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  handleDelete(conversation.id)
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
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-emerald-400">
              {conversation.model}
            </span>
            <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setIsCreatingFolder(false)
                  setNewFolderName('')
                }
              }}
              autoFocus
            />
            
            <div className="flex items-center gap-2">
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
              
              <div className="flex gap-1">
                {FOLDER_ICONS.slice(0, 5).map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-all ${
                      selectedIcon === icon 
                        ? 'bg-zinc-700 scale-110' 
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(false)
                  setNewFolderName('')
                }}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add folder button */}
        {!isCreatingFolder && (
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="w-full flex items-center gap-2 p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Folder
          </button>
        )}

        {/* Folders with conversations */}
        {folders.map((folder) => (
          <div key={folder.id} className="space-y-2">
            <div
              className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                dragOverFolderId === folder.id ? 'bg-zinc-800/50 ring-2 ring-emerald-600' : ''
              }`}
              onClick={() => toggleFolder(folder.id)}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverFolderId(folder.id)}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <svg 
                className={`w-3 h-3 text-zinc-400 transition-transform ${
                  expandedFolders.has(folder.id) ? 'rotate-90' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: folder.color || '#10b981' }}
              />
              <span className="text-sm">{folder.icon || '📁'}</span>
              
              {editingFolderId === folder.id ? (
                <input
                  type="text"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  className="flex-1 bg-zinc-800 text-zinc-100 px-2 py-0.5 rounded text-sm border border-zinc-700 focus:border-emerald-600 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateFolder(folder.id, editFolderName)
                    if (e.key === 'Escape') {
                      setEditingFolderId(null)
                      setEditFolderName('')
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => handleUpdateFolder(folder.id, editFolderName)}
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-zinc-300">
                  {folder.name}
                </span>
              )}
              
              <span className="text-xs text-zinc-500">
                {groupedConversations[folder.id]?.length || 0}
              </span>
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingFolderId(folder.id)
                    setEditFolderName(folder.name)
                  }}
                  className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                  title="Rename"
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
            
            {expandedFolders.has(folder.id) && (
              <div className="ml-6 space-y-2">
                {groupedConversations[folder.id]?.map(renderConversation)}
              </div>
            )}
          </div>
        ))}

        {/* Unfiled conversations */}
        {groupedConversations.unfiled.length > 0 && (
          <div className="space-y-2">
            <div
              className={`flex items-center gap-2 p-2 rounded-lg ${
                dragOverFolderId === 'unfiled' ? 'bg-zinc-800/50 ring-2 ring-emerald-600' : ''
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverFolderId('unfiled')}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => handleDrop(e, null)}
            >
              <span className="text-sm font-medium text-zinc-500">Unfiled</span>
              <span className="text-xs text-zinc-600">
                {groupedConversations.unfiled.length}
              </span>
            </div>
            <div className="space-y-2">
              {groupedConversations.unfiled.map(renderConversation)}
            </div>
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
    </div>
  )
}

export default memo(ConversationList)