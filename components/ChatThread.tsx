'use client'

import { useState, useCallback, memo } from 'react'
import { Citation } from '@/lib/web-search'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  metadata?: {
    citations?: Citation[]
  }
}

interface ChatThreadProps {
  messages: Message[]
  isLoading?: boolean
  streamingMessage?: string
  isSearching?: boolean
  currentCitations?: Citation[]
}

function ChatThread({ messages, isLoading, streamingMessage, isSearching, currentCitations }: ChatThreadProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())

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
    <div className="flex flex-col h-full">
      {messages.length === 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div className="max-w-md">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">Welcome to Gibby Chat</h2>
            <p className="text-zinc-400 mb-4">
              Your private AI assistant powered by local LLMs. Your conversations stay secure and private.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Start a conversation below
            </div>
          </div>
        </div>
      )}
      
      {(messages.length > 0 || isLoading || streamingMessage) && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          : message.content 
                      }}
                    />
                  </div>
                  
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

          {/* Streaming message */}
          {streamingMessage && (
            <div className="animate-in">
              <div className={`flex flex-col items-start`}>
                <div className="max-w-3xl rounded-2xl p-4 glassmorphism text-zinc-100">
                  {!isSearching && (
                    <div className="flex gap-1 mb-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  )}
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
        </div>
      )}
    </div>
  )
}

export default memo(ChatThread)