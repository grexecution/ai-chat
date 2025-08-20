/**
 * Shared type definitions for the application
 */

export interface User {
  id: string
  email: string
  name?: string | null
}

export interface Message {
  id: string
  conversationId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: any // JSON field for citations and other structured data
  createdAt: string | Date
}

export interface Folder {
  id: string
  userId?: string
  name: string
  color?: string
  icon?: string
  position: number
  isExpanded?: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
  _count?: {
    conversations: number
  }
}

export interface Conversation {
  id: string
  userId?: string
  folderId?: string | null
  folder?: Folder
  title: string
  model: string
  createdAt: string | Date
  updatedAt: string | Date
  messages?: Message[]
}

export interface ChatCompletionRequest {
  messages: Message[]
  model: string
  conversationId?: string
  stream?: boolean
  temperature?: number
  top_p?: number
}

export interface Model {
  id: string
  name: string
  description: string
}

export const AVAILABLE_MODELS: Model[] = [
  { id: 'llama3.2:1b', name: 'LLaMA 3.2 (1B)', description: 'Fast and efficient, low memory usage' },
  { id: 'tinyllama:latest', name: 'TinyLLaMA', description: 'Lightweight and fast' },
]

export const CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_TITLE_LENGTH: 50,
  MAX_FOLDER_NAME_LENGTH: 30,
  SESSION_MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  DEFAULT_MODEL: 'llama3.2:1b',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
} as const

export const FOLDER_COLORS = [
  { value: '#10b981', name: 'Emerald' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#8b5cf6', name: 'Purple' },
  { value: '#ef4444', name: 'Red' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#84cc16', name: 'Lime' },
] as const

export const FOLDER_ICONS = [
  '📁', '📂', '🗂️', '📚', '💼',
  '🎯', '🚀', '💡', '🔬', '🎨',
  '📝', '🔍', '⚡', '🌟', '🏷️'
] as const