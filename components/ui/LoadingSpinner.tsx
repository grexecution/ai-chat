import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'emerald' | 'zinc' | 'white'
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'emerald',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }
  
  const colorClasses = {
    emerald: 'border-emerald-400 border-t-transparent',
    zinc: 'border-zinc-500 border-t-transparent',
    white: 'border-white border-t-transparent',
  }
  
  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}