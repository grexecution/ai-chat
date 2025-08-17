/**
 * Simple logger utility for development and production
 * In production, you might want to integrate with a service like Sentry or LogRocket
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error)
    }
    // In production, send to error tracking service
    // e.g., Sentry.captureException(error)
  },
  
  warn: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data)
    }
  },
  
  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, data)
    }
  },
  
  debug: (message: string, data?: unknown) => {
    if (isDevelopment && process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data)
    }
  }
}