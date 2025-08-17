'use client'

import { useState, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface UseChatOptions {
  conversationId?: string
  onNewConversation?: (conversationId: string) => void
}

/**
 * Custom hook for managing chat conversations with streaming support
 * 
 * @param options - Configuration options for the chat
 * @param options.conversationId - Existing conversation ID to continue
 * @param options.onNewConversation - Callback when a new conversation is created
 * 
 * @returns Chat state and control functions
 * @returns messages - Array of chat messages
 * @returns isLoading - Loading state indicator
 * @returns streamingMessage - Current streaming assistant response
 * @returns sendMessage - Function to send a new message
 * @returns loadMessages - Function to load messages for a conversation
 * @returns clearMessages - Function to clear all messages
 */
export function useChat({ conversationId, onNewConversation }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')

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
   * Sends a message to the chat API and handles streaming response
   * 
   * @param content - The message content to send
   * @param model - The AI model to use for generation
   * 
   * @description
   * This function:
   * 1. Creates a user message and adds it to the UI
   * 2. Sends the message to the API with conversation context
   * 3. Handles SSE streaming for real-time response updates
   * 4. Manages conversation creation for new chats
   * 5. Updates UI with streaming content and final message
   */
  const sendMessage = useCallback(async (content: string, model: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setStreamingMessage('')

    try {
      const payload = {
        messages: [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        model,
        conversationId,
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
              // Stream is complete, break out of the while loop
              break
            }

            try {
              const parsed = JSON.parse(data)
              
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
                // Stream is complete
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
        setStreamingMessage('') // Clear streaming message first
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date().toISOString(),
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
    }
  }, [messages, conversationId, onNewConversation])

  /**
   * Clears all messages and streaming state
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setStreamingMessage('')
  }, [])

  return {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
    loadMessages,
    clearMessages,
  }
}