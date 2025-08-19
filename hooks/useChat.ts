'use client'

import { useState, useCallback, useEffect } from 'react'
import { type Citation } from '@/lib/web-search'
import { unreadStore } from '@/lib/unread-store'

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

interface FileAttachment {
  filename: string
  content: string
  metadata?: {
    pages?: number
    wordCount?: number
    type?: string
  }
}

interface UseChatOptions {
  conversationId?: string
  onNewConversation?: (conversationId: string) => void
}

/**
 * Custom hook for managing chat conversations with streaming support, web search, and file attachments
 * 
 * @param options - Configuration options for the chat
 * @param options.conversationId - Existing conversation ID to continue
 * @param options.onNewConversation - Callback when a new conversation is created
 * 
 * @returns Chat state and control functions
 * @returns messages - Array of chat messages with potential citations and file metadata
 * @returns isLoading - Loading state indicator
 * @returns streamingMessage - Current streaming assistant response
 * @returns isSearching - Whether web search is in progress
 * @returns currentCitations - Citations for the current streaming message
 * @returns attachedFiles - Currently attached files
 * @returns sendMessage - Function to send a new message with optional files
 * @returns loadMessages - Function to load messages for a conversation
 * @returns clearMessages - Function to clear all messages
 * @returns attachFiles - Function to attach files for the next message
 * @returns removeFile - Function to remove an attached file
 */
export function useChat({ conversationId, onNewConversation }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([])
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  /**
   * Loads messages for a specific conversation from the API
   * @param convId - The conversation ID to load messages for
   */
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [])

  /**
   * Attach files for the next message
   * @param files - FileList or array of Files to attach
   */
  const attachFiles = useCallback(async (files: FileList | File[]) => {
    setIsUploadingFiles(true)
    
    try {
      const formData = new FormData()
      const fileArray = Array.from(files)
      
      fileArray.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const result = await response.json()
      
      // Add parsed files to attachments
      const newAttachments: FileAttachment[] = result.files.map((file: any) => ({
        filename: file.filename,
        content: file.content,
        metadata: file.metadata
      }))

      setAttachedFiles(prev => [...prev, ...newAttachments])

    } catch (error) {
      console.error('Failed to attach files:', error)
      throw error
    } finally {
      setIsUploadingFiles(false)
    }
  }, [])

  /**
   * Remove an attached file
   * @param filename - The name of the file to remove
   */
  const removeFile = useCallback((filename: string) => {
    setAttachedFiles(prev => prev.filter(f => f.filename !== filename))
  }, [])

  /**
   * Sends a message to the chat API and handles streaming response with web search and file context
   * 
   * @param content - The message content to send
   * @param model - The AI model to use for generation
   * 
   * @description
   * This function:
   * 1. Creates a user message and adds it to the UI
   * 2. Includes any attached files in the message context
   * 3. Sends the message to the API with conversation context
   * 4. Handles web search if needed based on query content
   * 5. Handles SSE streaming for real-time response updates
   * 6. Manages conversation creation for new chats
   * 7. Updates UI with streaming content, citations, and final message
   */
  const sendMessage = useCallback(async (content: string, model: string) => {
    if (!content.trim() && attachedFiles.length === 0) return

    // Build message content with file context
    let fullContent = content.trim()
    
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map((file, index) => {
        const header = `[Attached File ${index + 1}: ${file.filename}]`
        const metadata = file.metadata 
          ? `(${file.metadata.type || 'Document'}, ${file.metadata.wordCount || 0} words${file.metadata.pages ? `, ${file.metadata.pages} pages` : ''})`
          : ''
        
        return `${header} ${metadata}\n${file.content.slice(0, 5000)}${file.content.length > 5000 ? '...[truncated]' : ''}`
      }).join('\n\n')

      fullContent = `${content.trim()}\n\n=== ATTACHED FILES ===\n${fileContext}\n=== END OF FILES ===`
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(), // Show only the user's message in UI
      createdAt: new Date().toISOString(),
      metadata: attachedFiles.length > 0 ? {
        files: attachedFiles.map(f => ({
          filename: f.filename,
          type: f.metadata?.type || 'Unknown',
          size: f.content.length
        }))
      } : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setStreamingMessage('')
    setIsSearching(false)
    setCurrentCitations([])
    
    // Clear attached files after sending
    const filesForRequest = [...attachedFiles]
    setAttachedFiles([])

    try {
      // Build messages array with full content for API
      const messagesForAPI = [...messages, {
        role: userMessage.role,
        content: fullContent // Include file context in API request
      }]

      const payload = {
        messages: messagesForAPI,
        model,
        conversationId,
        includeFiles: filesForRequest.length > 0,
        fileMetadata: filesForRequest.length > 0 ? {
          files: filesForRequest.map(f => ({
            filename: f.filename,
            type: f.metadata?.type || 'Unknown',
            size: f.content.length
          }))
        } : undefined
      }

      const res = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantContent = ''
      let newConversationId = conversationId
      let messageCitations: Citation[] = []

      // Process SSE stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              break
            }

            try {
              const parsed = JSON.parse(data)
              
              // Handle search status
              if (parsed.isSearching !== undefined) {
                setIsSearching(parsed.isSearching)
                if (parsed.searchMessage) {
                  console.log('Search status:', parsed.searchMessage)
                }
              }
              
              // Handle citations
              if (parsed.citations) {
                messageCitations = parsed.citations
                setCurrentCitations(parsed.citations)
              }
              
              // Handle new conversation ID
              if (parsed.conversationId && !conversationId) {
                newConversationId = parsed.conversationId
                if (newConversationId) {
                  onNewConversation?.(newConversationId)
                }
              }

              // Handle content delta
              if (parsed.choices?.[0]?.delta?.content) {
                const delta = parsed.choices[0].delta.content
                assistantContent += delta
                setStreamingMessage(assistantContent)
              }
              
              // Check if this is the final chunk with finish_reason
              if (parsed.choices?.[0]?.finish_reason === 'stop') {
                break
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      // Clear streaming message first, then add final assistant message
      if (assistantContent) {
        setStreamingMessage('')
        setIsSearching(false)
        setCurrentCitations([])
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date().toISOString(),
          metadata: messageCitations.length > 0 ? { citations: messageCitations } : undefined
        }

        setMessages(prev => [...prev, assistantMessage])
      }

    } catch (error) {
      console.error('Chat error:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date().toISOString(),
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
      setIsSearching(false)
      setCurrentCitations([])
    }
  }, [messages, conversationId, onNewConversation, attachedFiles])

  /**
   * Clears all messages and streaming state
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setStreamingMessage('')
    setIsSearching(false)
    setCurrentCitations([])
    setAttachedFiles([])
  }, [])

  return {
    messages,
    isLoading,
    streamingMessage,
    isSearching,
    currentCitations,
    attachedFiles,
    isUploadingFiles,
    sendMessage,
    loadMessages,
    clearMessages,
    attachFiles,
    removeFile,
  }
}