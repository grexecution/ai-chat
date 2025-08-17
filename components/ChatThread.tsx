'use client'

import { useState, useCallback, memo } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatThreadProps {
  messages: Message[]
  isLoading?: boolean
  streamingMessage?: string
}

function ChatThread({ messages, isLoading, streamingMessage }: ChatThreadProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [])

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }, [])

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
        <div className="p-6 space-y-6">

      {messages.map((message) => (
        <div key={message.id} className="animate-in">
          <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-2xl p-4 ${
              message.role === 'user'
                ? 'bg-emerald-600/20 border border-emerald-600/30 text-emerald-50'
                : 'glassmorphism text-zinc-100'
            }`}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-zinc-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                  
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {message.content}
                    </pre>
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="mt-2 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors flex items-center gap-1"
                  >
                    {copiedId === message.id ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Streaming message */}
      {streamingMessage && (
        <div className="animate-in">
          <div className="flex gap-4 justify-start">
            <div className="max-w-3xl rounded-2xl p-4 glassmorphism text-zinc-100">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                  
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {streamingMessage}
                      <span className="inline-block w-2 h-5 bg-emerald-400 animate-pulse ml-1"></span>
                    </pre>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !streamingMessage && (
        <div className="flex justify-start">
          <div className="glassmorphism rounded-2xl p-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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