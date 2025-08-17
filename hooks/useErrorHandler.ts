import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

interface UseErrorHandlerReturn {
  error: string | null
  isError: boolean
  setError: (error: string | null) => void
  clearError: () => void
  handleError: (error: unknown, customMessage?: string) => void
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    let errorMessage = customMessage || 'An unexpected error occurred'
    
    if (error instanceof Error) {
      errorMessage = customMessage || error.message
      logger.error(errorMessage, error)
    } else if (typeof error === 'string') {
      errorMessage = error
      logger.error(errorMessage)
    } else {
      logger.error(errorMessage, error)
    }
    
    setError(errorMessage)
  }, [])

  return {
    error,
    isError: !!error,
    setError,
    clearError,
    handleError,
  }
}