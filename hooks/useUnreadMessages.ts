'use client'

import { useState, useEffect } from 'react'
import { unreadStore } from '@/lib/unread-store'

/**
 * Hook for tracking unread messages in conversations
 */
export function useUnreadMessages() {
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Subscribe to unread changes
    const unsubscribe = unreadStore.subscribe(setUnreadConversations)
    
    return unsubscribe
  }, [])

  return {
    unreadConversations,
    markUnread: (conversationId: string) => unreadStore.markUnread(conversationId),
    markRead: (conversationId: string) => unreadStore.markRead(conversationId),
    hasUnread: (conversationId: string) => unreadStore.hasUnread(conversationId),
  }
}