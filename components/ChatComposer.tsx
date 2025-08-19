'use client'

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
import { SUPPORTED_FILE_TYPES, FILE_TYPE_INFO } from '@/lib/file-parser'

interface ChatComposerProps {
  onSendMessage: (message: string, model: string) => void
  onAttachFiles?: (files: FileList | File[]) => Promise<void>
  onRemoveFile?: (filename: string) => void
  attachedFiles?: Array<{
    filename: string
    metadata?: {
      type?: string
      wordCount?: number
      pages?: number
    }
  }>
  isUploadingFiles?: boolean
  disabled?: boolean
  currentModel: string
  onModelChange: (model: string) => void
}

const AVAILABLE_MODELS = [
  { id: 'llama3.2:3b', name: 'LLaMA 3.2 (Balanced)', description: '⚖️ Best accuracy vs speed, 128K context' },
]

function ChatComposer({ 
  onSendMessage, 
  onAttachFiles,
  onRemoveFile,
  attachedFiles = [],
  isUploadingFiles = false,
  disabled, 
  currentModel, 
  onModelChange 
}: ChatComposerProps) {
  const [message, setMessage] = useState('')
  const [showModels, setShowModels] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [showFileHelp, setShowFileHelp] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || attachedFiles.length > 0) && !disabled) {
      onSendMessage(message.trim(), currentModel)
      setMessage('')
    }
  }, [message, attachedFiles.length, disabled, onSendMessage, currentModel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const validateFiles = useCallback((files: FileList | File[]): boolean => {
    const fileArray = Array.from(files)
    const unsupportedFiles = fileArray.filter(file => {
      const isSupported = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type) ||
        file.name.endsWith('.md') || // Special case for markdown
        file.name.endsWith('.txt') // Sometimes text files have wrong mime type
      return !isSupported
    })
    
    if (unsupportedFiles.length > 0) {
      const names = unsupportedFiles.map(f => f.name).join(', ')
      setFileError(`Nicht unterstützte Dateien: ${names}`)
      setShowFileHelp(true)
      setTimeout(() => setFileError(null), 5000)
      return false
    }
    
    setFileError(null)
    return true
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && onAttachFiles) {
      if (!validateFiles(files)) {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
      
      try {
        await onAttachFiles(files)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } catch (error) {
        console.error('Failed to attach files:', error)
        setFileError('Fehler beim Verarbeiten der Dateien')
        setTimeout(() => setFileError(null), 5000)
      }
    }
  }, [onAttachFiles, validateFiles])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onAttachFiles) {
      if (!validateFiles(e.dataTransfer.files)) {
        return
      }
      
      try {
        await onAttachFiles(e.dataTransfer.files)
      } catch (error) {
        console.error('Failed to attach files:', error)
        setFileError('Fehler beim Verarbeiten der Dateien')
        setTimeout(() => setFileError(null), 5000)
      }
    }
  }, [onAttachFiles, validateFiles])

  const currentModelInfo = useMemo(
    () => AVAILABLE_MODELS.find(m => m.id === currentModel) || AVAILABLE_MODELS[0],
    [currentModel]
  )

  const acceptedFileTypes = Object.keys(SUPPORTED_FILE_TYPES).join(',')

  return (
    <div className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="p-4">
        <form onSubmit={handleSubmit} className="mx-auto">
          {/* File Error Message */}
          {fileError && (
            <div className="mb-3 p-3 bg-red-950/30 border border-red-900/30 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-300">{fileError}</p>
            </div>
          )}

          {/* Supported File Types Help */}
          {showFileHelp && (
            <div className="mb-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-zinc-200">Unterstützte Dateiformate</h4>
                <button
                  type="button"
                  onClick={() => setShowFileHelp(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(FILE_TYPE_INFO).map(([ext, info]) => (
                  <div key={ext} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      info.quality === 'excellent' ? 'bg-emerald-500' :
                      info.quality === 'good' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`} />
                    <span className="text-zinc-300 font-medium">.{ext}</span>
                    <span className="text-zinc-500">- {info.description}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                🟢 Excellent • 🔵 Gut • 🟡 Basis
              </p>
            </div>
          )}

          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-300 border border-zinc-700"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="max-w-[150px] truncate">{file.filename}</span>
                  {file.metadata && (
                    <span className="text-zinc-500">
                      ({file.metadata.wordCount} words{file.metadata.pages ? `, ${file.metadata.pages}p` : ''})
                    </span>
                  )}
                  {onRemoveFile && (
                    <button
                      type="button"
                      onClick={() => onRemoveFile(file.filename)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {isUploadingFiles && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-400">
                  <div className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              )}
            </div>
          )}

          {/* Message Input with Drag & Drop */}
          <div 
            className="relative mb-2"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className={`glassmorphism rounded-2xl border ${
              dragActive ? 'border-emerald-400 bg-emerald-950/20' : 'border-zinc-800/50'
            } focus-within:border-emerald-600/50 transition-all`}>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled || isUploadingFiles}
                placeholder={dragActive ? "Drop files here..." : "Ask me anything or drop files..."}
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 p-4 pr-24 resize-none focus:outline-none min-h-[60px] max-h-40"
                rows={1}
              />
            
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {/* File Upload Button */}
                {onAttachFiles && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={acceptedFileTypes}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFiles}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 transition-all"
                      title="Attach files"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    
                    {/* File Help Button */}
                    <button
                      type="button"
                      onClick={() => setShowFileHelp(!showFileHelp)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 transition-all"
                      title="Unterstützte Dateiformate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!message.trim() && attachedFiles.length === 0) || disabled || isUploadingFiles}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    (message.trim() || attachedFiles.length > 0) && !disabled && !isUploadingFiles
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

            {/* Drag Overlay */}
            {dragActive && (
              <div className="absolute inset-0 rounded-2xl bg-emerald-950/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-emerald-300">Drop files to upload</p>
                  <p className="text-xs text-zinc-400 mt-1">PDF, Word, Excel, PowerPoint, and more</p>
                </div>
              </div>
            )}
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
              
              {(message.length > 0 || attachedFiles.length > 0) && (
                <>
                  <span className="text-zinc-600">•</span>
                  {attachedFiles.length > 0 && (
                    <span className="text-emerald-400">
                      {attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''} attached
                    </span>
                  )}
                  {message.length > 0 && (
                    <span className={message.length > 2000 ? 'text-orange-400' : 'text-zinc-500'}>
                      {message.length}/2000
                    </span>
                  )}
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