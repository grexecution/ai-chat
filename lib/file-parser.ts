/**
 * File parser types and utilities
 * Actual parsing happens server-side only
 */

export interface ParsedFile {
  filename: string
  content: string
  metadata?: {
    pages?: number
    wordCount?: number
    type?: string
  }
}

/**
 * Supported file types for document parsing
 * Only includes formats with reliable text extraction
 */
export const SUPPORTED_FILE_TYPES = {
  // Well-supported formats
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'text/html': 'html',
  'text/markdown': 'md',
  // Basic support - may have limited extraction
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

// User-friendly descriptions of supported formats
export const FILE_TYPE_INFO = {
  'pdf': { name: 'PDF', quality: 'excellent', description: 'Vollständige Textextraktion' },
  'txt': { name: 'Text', quality: 'excellent', description: 'Direkte Textverarbeitung' },
  'csv': { name: 'CSV', quality: 'excellent', description: 'Strukturierte Daten' },
  'json': { name: 'JSON', quality: 'excellent', description: 'Strukturierte Daten' },
  'html': { name: 'HTML', quality: 'good', description: 'Text ohne Formatierung' },
  'md': { name: 'Markdown', quality: 'excellent', description: 'Formatierter Text' },
  'docx': { name: 'Word', quality: 'basic', description: 'Einfache Textextraktion' },
  'xlsx': { name: 'Excel', quality: 'basic', description: 'Begrenzte Datenextraktion' },
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Format parsed files for inclusion in chat context
 */
export function formatFilesForContext(files: ParsedFile[]): string {
  if (files.length === 0) return ''

  const formatted = files.map((file, index) => {
    const header = `=== FILE ${index + 1}: ${file.filename} ===`
    const metadata = file.metadata 
      ? `Type: ${file.metadata.type || 'Unknown'} | Words: ${file.metadata.wordCount || 0}${file.metadata.pages ? ` | Pages: ${file.metadata.pages}` : ''}`
      : ''
    
    return `${header}
${metadata}

${file.content}

=== END OF FILE ${index + 1} ===`
  }).join('\n\n')

  return `\n\n=== UPLOADED FILES ===\n${formatted}\n=== END OF UPLOADED FILES ===\n\nPlease analyze and answer questions about the uploaded files above.`
}

/**
 * Validate file before parsing (client-side safe)
 */
export function validateFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    }
  }

  if (!SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}`
    }
  }

  return { valid: true }
}