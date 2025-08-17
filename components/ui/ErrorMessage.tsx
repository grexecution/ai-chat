import React from 'react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorMessage({ 
  message, 
  onRetry,
  className = '' 
}: ErrorMessageProps) {
  return (
    <div className={`bg-red-900/20 border border-red-600/30 text-red-300 p-4 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <svg 
          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}