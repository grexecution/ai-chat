'use client'

import { useState, useCallback, memo, useEffect, useRef } from 'react'
import { Citation } from '@/lib/web-search'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  metadata?: {
    citations?: Citation[]
    files?: Array<{
      filename: string
      type: string
      size: number
    }>
  }
}

interface ChatThreadProps {
  messages: Message[]
  isLoading?: boolean
  streamingMessage?: string
  isSearching?: boolean
  currentCitations?: Citation[]
  conversationId?: string
  onSendMessage?: (message: string) => void
}

function ChatThread({ messages, isLoading, streamingMessage, isSearching, currentCitations, conversationId, onSendMessage }: ChatThreadProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<{ messageId: string; filename: string } | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(messages.length)
  const previousConversationIdRef = useRef(conversationId)
  
  // Cycle through loading messages
  useEffect(() => {
    if (isLoading && !streamingMessage && !isSearching) {
      const loadingMessages = [
        'Denke nach...',
        'Analysiere Anfrage...',
        'Bereite Antwort vor...',
        'Verarbeite Informationen...'
      ]
      
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [isLoading, streamingMessage, isSearching])

  // Track scroll position and unread messages
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const isNearBottom = distanceFromBottom < 100
      
      // Show button when scrolled up more than 100px from bottom
      setShowScrollButton(!isNearBottom)
      
      // Clear unread if scrolled to bottom
      if (isNearBottom) {
        setHasUnreadMessages(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    // Initial check after a brief delay to ensure DOM is ready
    setTimeout(handleScroll, 100)
    
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length]) // Re-check when messages change

  // Detect new messages and mark as unread if not at bottom
  useEffect(() => {
    // Check if conversation changed
    const conversationChanged = conversationId !== previousConversationIdRef.current
    
    if (conversationChanged && messages.length > 0) {
      // New conversation loaded, always scroll to bottom
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'auto' })
        setHasUnreadMessages(false)
      }, 100)
    } else if (messages.length > previousMessageCountRef.current) {
      // New message in existing conversation
      const container = scrollContainerRef.current
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        
        if (!isNearBottom) {
          // User is not at bottom, mark as unread
          setHasUnreadMessages(true)
        } else {
          // Auto-scroll to new message if at bottom
          setTimeout(() => {
            lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }
    }
    
    previousMessageCountRef.current = messages.length
    previousConversationIdRef.current = conversationId
  }, [messages.length, conversationId])

  // Auto-scroll when streaming starts
  useEffect(() => {
    if (streamingMessage && !hasUnreadMessages) {
      const container = scrollContainerRef.current
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
        
        if (isNearBottom) {
          lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }, [streamingMessage, hasUnreadMessages])

  const scrollToBottom = useCallback(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
    setHasUnreadMessages(false)
  }, [])

  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [])

  const toggleCitationExpansion = useCallback((messageId: string) => {
    setExpandedCitations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }, [])

  const renderMessageWithCitations = (content: string) => {
    // Replace [1], [2] etc with superscript links
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      return `<sup class="text-emerald-400 cursor-help">[${num}]</sup>`
    })
  }

  const handleFileClick = useCallback((messageId: string, filename: string) => {
    // For now, just show an alert with file info
    // In a full implementation, this could open a modal with file preview
    alert(`File: ${filename}\n\nPreview functionality can be enhanced to show file contents in a modal or download the file.`)
  }, [])

  const renderFileAttachments = (files: Array<{ filename: string; type: string; size: number }> | undefined, messageId: string) => {
    if (!files || files.length === 0) return null

    const getFileIcon = (type: string) => {
      if (type.includes('pdf') || type.includes('PDF')) {
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H11V10H18V20H6Z"/>
          </svg>
        )
      } else if (type.includes('Word') || type.includes('word')) {
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,9V3.5L18.5,9H13M15.2,20L13.5,15.3L11.8,20H10L12.8,12H14.1L17,20H15.2Z"/>
          </svg>
        )
      } else if (type.includes('Excel') || type.includes('Spreadsheet')) {
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M13,3.5V9H18.5L13,3.5M17,11H13V13H14L12,14.67L10,13H11V11H7V13H8L11,15.5L8,18H7V20H11V18H10L12,16.33L14,18H13V20H17V18H16L13,15.5L16,13H17V11Z"/>
          </svg>
        )
      } else {
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      }
    }

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
      return (bytes / 1048576).toFixed(1) + ' MB'
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {files.map((file, index) => (
          <div
            key={index}
            onClick={() => handleFileClick(messageId, file.filename)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-emerald-600/30 transition-colors group cursor-pointer"
            title={`${file.filename} (${formatFileSize(file.size)})`}
          >
            <div className="text-zinc-400 group-hover:text-emerald-400 transition-colors">
              {getFileIcon(file.type)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 max-w-[150px] truncate">
                {file.filename}
              </span>
              <span className="text-xs text-zinc-600">
                {file.type.split(' ')[0]} • {formatFileSize(file.size)}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderCitations = (citations: Citation[] | undefined, messageId: string) => {
    if (!citations || citations.length === 0) return null

    const isExpanded = expandedCitations.has(messageId)

    return (
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <button
          onClick={() => toggleCitationExpansion(messageId)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg 
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">Sources ({citations.length})</span>
        </button>
        
        {isExpanded && (
          <div className="mt-2 space-y-2 animate-in">
            {citations.map((citation, idx) => (
              <a
                key={citation.id}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 text-xs font-bold mt-0.5">[{idx + 1}]</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                      {citation.title}
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5">
                      {citation.url}
                    </div>
                    {citation.snippet && (
                      <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {citation.snippet}
                      </div>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {messages.length === 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div className="max-w-2xl w-full">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">Welcome to Gibby Chat</h2>
            <p className="text-zinc-400 mb-6">
              Your private AI assistant powered by local LLMs. Your conversations stay secure and private.
            </p>
            
            {/* Example Prompts */}
            {onSendMessage && (
              <div className="mb-6">
                <p className="text-sm text-zinc-500 mb-3">Try asking:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  <button
                    onClick={() => onSendMessage("Explain quantum computing in simple terms")}
                    className="text-left p-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">💡</span>
                      <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Explain quantum computing in simple terms</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => onSendMessage("What is the weather in Venice Italy")}
                    className="text-left p-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">🌤️</span>
                      <span className="text-sm text-zinc-300 group-hover:text-zinc-100">What is the weather in Venice Italy</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => onSendMessage("What are the benefits of meditation?")}
                    className="text-left p-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">🧘</span>
                      <span className="text-sm text-zinc-300 group-hover:text-zinc-100">What are the benefits of meditation?</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => onSendMessage("Help me plan a productive morning routine")}
                    className="text-left p-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">🌅</span>
                      <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Help me plan a productive morning routine</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Start a conversation below
            </div>
          </div>
        </div>
      )}
      
      {(messages.length > 0 || isLoading || streamingMessage) && (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Render messages */}
          {messages.map((message) => (
            <div key={message.id} className="animate-in">
              <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-3xl rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-emerald-600/20 border border-emerald-600/30 text-emerald-50'
                    : 'glassmorphism text-zinc-100'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre 
                      className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: message.role === 'assistant' 
                          ? renderMessageWithCitations(message.content)
                          : (() => {
                              // For user messages with files, strip the file content
                              const content = message.content
                              const fileStartIndex = content.indexOf('\n\n=== ATTACHED FILES ===')
                              if (fileStartIndex !== -1) {
                                return content.substring(0, fileStartIndex).trim()
                              }
                              return content
                            })()
                      }}
                    />
                  </div>
                  
                  {/* Render file attachments for user messages */}
                  {message.role === 'user' && renderFileAttachments(message.metadata?.files, message.id)}
                  
                  {/* Render citations for assistant messages */}
                  {message.role === 'assistant' && renderCitations(message.metadata?.citations, message.id)}
                </div>
                
                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(message.content, message.id)}
                  className="mt-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                  {copiedId === message.id ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {/* Search indicator */}
          {isSearching && (
            <div className="animate-in">
              <div className="flex flex-col items-start">
                <div className="max-w-3xl rounded-2xl p-4 bg-blue-600/10 border border-blue-600/30 text-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <span className="text-sm">Searching the web for current information...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading state - shows immediately when message is sent */}
          {isLoading && !streamingMessage && !isSearching && (
            <div className="animate-in">
              <div className="flex flex-col items-start">
                <div className="max-w-3xl rounded-2xl p-4 glassmorphism text-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-zinc-300 transition-opacity duration-500">
                      {['Denke nach...', 'Analysiere Anfrage...', 'Bereite Antwort vor...', 'Verarbeite Informationen...'][loadingMessageIndex]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="animate-in">
              <div className={`flex flex-col items-start`}>
                <div className="max-w-3xl rounded-2xl p-4 glassmorphism text-zinc-100">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre 
                      className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: renderMessageWithCitations(streamingMessage)
                      }}
                    >
                    </pre>
                    <span className="inline-block w-2 h-5 bg-emerald-400 animate-pulse ml-1"></span>
                  </div>
                  
                  {/* Show current citations while streaming */}
                  {currentCitations && currentCitations.length > 0 && renderCitations(currentCitations, 'streaming')}
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible div for scroll reference */}
          <div ref={lastMessageRef} className="h-1" />
        </div>
      )}
      
      {/* Scroll to bottom button */}
      {showScrollButton && (messages.length > 0 || streamingMessage) && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={scrollToBottom}
            className="group relative bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full p-3 shadow-lg transition-all hover:scale-110"
            title="Nach unten scrollen"
          >
            {/* Unread notification badge */}
            {hasUnreadMessages && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            )}
            
            <svg className="w-5 h-5 text-zinc-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            
            {/* Tooltip */}
            {hasUnreadMessages && (
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-zinc-900 text-xs text-zinc-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Neue Nachrichten
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(ChatThread)