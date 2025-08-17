/**
 * Application-wide constants
 */

// API Configuration
export const API_ENDPOINTS = {
  CHAT: '/api/v1/chat/completions',
  CONVERSATIONS: '/api/conversations',
  ACCOUNT_UPDATE: '/api/account/update',
} as const

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DELAY: {
    SHORT: 200,
    MEDIUM: 400,
    LONG: 600,
  },
  MESSAGE: {
    MAX_LENGTH: 2000,
    WARNING_THRESHOLD: 1800,
  },
  TITLE: {
    MAX_LENGTH: 50,
    PREVIEW_WORDS: 4,
  },
  COPY_FEEDBACK_DURATION: 2000,
} as const

// Model Configuration
export const MODEL_CONFIG = {
  DEFAULT: 'gemma2:2b',  // Fast model as default
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
} as const

// Session Configuration
export const SESSION_CONFIG = {
  MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
  COOKIE_NAME: 'gibby-chat.session-token',
} as const

// Environment
export const ENV = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  DATABASE_URL: process.env.DATABASE_URL,
} as const