'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ConversationList from '@/components/ConversationList'
import ChatThread from '@/components/ChatThread'
import ChatComposer from '@/components/ChatComposer'
import { useChat } from '@/hooks/useChat'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>()
  const [currentModel, setCurrentModel] = useState('llama3.2:latest')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
    loadMessages,
    clearMessages,
  } = useChat({
    conversationId: currentConversationId,
    onNewConversation: (conversationId) => {
      setCurrentConversationId(conversationId)
    },
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId)
    } else {
      clearMessages()
    }
  }, [currentConversationId, clearMessages, loadMessages])

  // Handle close sidebar event from ConversationList
  useEffect(() => {
    const handleCloseSidebar = () => setIsSidebarOpen(false)
    window.addEventListener('closeSidebar', handleCloseSidebar)
    return () => window.removeEventListener('closeSidebar', handleCloseSidebar)
  }, [])

  const handleSendMessage = async (message: string, model: string) => {
    await sendMessage(message, model)
  }

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Don't render chat if not authenticated
  if (status === 'unauthenticated' || !session) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      {/* Mobile Header - Smaller */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentConversationId(undefined)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <ConversationList
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onNewConversation={() => setCurrentConversationId(undefined)}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Sliding Sidebar */}
            <div className={`md:hidden fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <ConversationList
                currentConversationId={currentConversationId}
                onSelectConversation={(id) => {
                  setCurrentConversationId(id)
                  setIsSidebarOpen(false)
                }}
                onNewConversation={() => {
                  setCurrentConversationId(undefined)
                  setIsSidebarOpen(false)
                }}
              />
            </div>
          </>
        )}
        
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ChatThread
              messages={messages}
              streamingMessage={streamingMessage}
              isLoading={isLoading}
            />
          </div>
          
          <div className="flex-shrink-0">
            <ChatComposer
              onSendMessage={handleSendMessage}
              disabled={isLoading}
              currentModel={currentModel}
              onModelChange={setCurrentModel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}