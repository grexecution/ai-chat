/**
 * Simple global store for tracking unread messages across conversations
 * This allows background conversations to update while maintaining state
 */

type UnreadListener = (unreadConversations: Set<string>) => void

class UnreadStore {
  private unreadConversations = new Set<string>()
  private listeners = new Set<UnreadListener>()

  // Mark conversation as having unread messages
  markUnread(conversationId: string) {
    this.unreadConversations.add(conversationId)
    this.notifyListeners()
  }

  // Clear unread status for a conversation
  markRead(conversationId: string) {
    this.unreadConversations.delete(conversationId)
    this.notifyListeners()
  }

  // Check if conversation has unread messages
  hasUnread(conversationId: string): boolean {
    return this.unreadConversations.has(conversationId)
  }

  // Get all unread conversation IDs
  getUnread(): Set<string> {
    return new Set(this.unreadConversations)
  }

  // Subscribe to unread changes
  subscribe(listener: UnreadListener) {
    this.listeners.add(listener)
    // Immediately notify with current state
    listener(this.getUnread())
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.getUnread())
    })
  }
}

// Singleton instance
export const unreadStore = new UnreadStore()