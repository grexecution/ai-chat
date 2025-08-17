'use client'

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'

interface ChatComposerProps {
  onSendMessage: (message: string, model: string) => void
  disabled?: boolean
  currentModel: string
  onModelChange: (model: string) => void
}

const AVAILABLE_MODELS = [
  { id: 'llama3.2:3b', name: 'LLaMA 3.2 (Balanced)', description: '⚖️ Best accuracy vs speed, 128K context' },
]

function ChatComposer({ 
  onSendMessage, 
  disabled, 
  currentModel, 
  onModelChange 
}: ChatComposerProps) {
  const [message, setMessage] = useState('')
  const [showModels, setShowModels] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), currentModel)
      setMessage('')
    }
  }, [message, disabled, onSendMessage, currentModel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const currentModelInfo = useMemo(
    () => AVAILABLE_MODELS.find(m => m.id === currentModel) || AVAILABLE_MODELS[0],
    [currentModel]
  )

  return (
    <div className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="p-4">
        <form onSubmit={handleSubmit} className="mx-auto">
          {/* Message Input */}
          <div className="relative mb-2">
            <div className="glassmorphism rounded-2xl border border-zinc-800/50 focus-within:border-emerald-600/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder="Ask me anything..."
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 p-4 pr-12 resize-none focus:outline-none min-h-[60px] max-h-40"
                rows={1}
              />
            
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className={`absolute right-3 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                message.trim() && !disabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {disabled ? (
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Footer with Model Selector and Info */}
        <div className="flex flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModels(!showModels)}
                className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors"
              >
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span>{currentModelInfo.name}</span>
                <svg 
                  className={`w-3 h-3 transition-transform ${showModels ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showModels && (
                <div className="absolute bottom-full mb-2 left-0 min-w-[280px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10">
                  <div className="p-2">
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onModelChange(model.id)
                          setShowModels(false)
                        }}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                          model.id === currentModel
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30'
                            : 'hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{model.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="hidden sm:inline text-zinc-600">•</span>
            <span className="hidden sm:inline">Shift + Enter for new line</span>
            
            {message.length > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <span className={message.length > 2000 ? 'text-orange-400' : 'text-zinc-500'}>
                  {message.length}/2000
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span>Secure • Private • Local</span>
          </div>
        </div>
        </form>
      </div>
    </div>
  )
}

export default memo(ChatComposer)