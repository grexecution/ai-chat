/**
 * Server-side file parsing
 * This module can only be imported in server components/API routes
 */

import { ParsedFile, SUPPORTED_FILE_TYPES } from './file-parser'

/**
 * Parse a file and extract its text content
 * Server-side only
 */
export async function parseFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedFile> {
  try {
    const fileType = SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES]
    
    if (!fileType) {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }

    let content = ''
    let metadata: ParsedFile['metadata'] = {}

    switch (fileType) {
      case 'pdf':
        try {
          // Dynamic import to avoid build issues
          // @ts-expect-error - pdf-parse-fork doesn't have TypeScript declarations
          const pdfParse = (await import('pdf-parse-fork')).default
          const pdfData = await pdfParse(buffer)
          
          content = pdfData.text
          metadata = {
            pages: pdfData.numpages,
            wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
            type: 'PDF Document'
          }
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError)
          // Fallback to basic extraction
          content = extractTextFromBuffer(buffer, 'pdf')
          metadata = {
            wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
            type: 'PDF Document (partial extraction)'
          }
        }
        break

      case 'docx':
        // DOCX files are ZIP archives with XML content
        content = await extractFromDocx(buffer)
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'Word Document'
        }
        break

      case 'xlsx':
      case 'xls':
        // For Excel files, extract visible text
        content = await extractFromExcel(buffer)
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'Excel Spreadsheet'
        }
        break

      case 'pptx':
      case 'ppt':
        // PowerPoint files - extract slide text
        content = extractTextFromBuffer(buffer, 'powerpoint')
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'PowerPoint Presentation'
        }
        break

      case 'doc':
      case 'odt':
      case 'ods':
      case 'odp':
        // Legacy formats - extract what text we can
        content = extractTextFromBuffer(buffer, 'office')
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: fileType.toUpperCase() + ' Document'
        }
        break

      case 'txt':
      case 'md':
        content = buffer.toString('utf-8')
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: fileType === 'md' ? 'Markdown Document' : 'Text Document'
        }
        break

      case 'csv':
        // Parse CSV for better formatting
        content = buffer.toString('utf-8')
        // Convert CSV to a more readable format
        const lines = content.split('\n').filter(l => l.trim())
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim())
          content = `CSV Data with columns: ${headers.join(', ')}\n\n${content}`
        }
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'CSV Spreadsheet'
        }
        break

      case 'json':
        const jsonData = JSON.parse(buffer.toString('utf-8'))
        content = JSON.stringify(jsonData, null, 2)
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'JSON Data'
        }
        break

      case 'html':
        // Strip HTML tags for better readability
        const htmlContent = buffer.toString('utf-8')
        content = htmlContent
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'HTML Document'
        }
        break

      default:
        // Fallback: try to extract as text
        content = buffer.toString('utf-8')
        metadata = {
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          type: 'Document'
        }
    }

    // Clean up content
    content = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Limit content size for very large files
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '\n\n[Content truncated due to size limits]'
    }

    // Ensure we have readable content
    if (!content || content.length < 10) {
      content = 'Unable to extract readable text from this file. The file may be encrypted, corrupted, or in an unsupported format.'
    }

    return {
      filename,
      content,
      metadata
    }

  } catch (error) {
    console.error(`Error parsing file ${filename}:`, error)
    
    // Return a meaningful error message
    return {
      filename,
      content: `Unable to parse this file. It may be encrypted, corrupted, or require special software to read. File type: ${mimeType}`,
      metadata: {
        type: 'Unknown',
        wordCount: 0
      }
    }
  }
}

/**
 * Basic text extraction from binary buffers
 */
function extractTextFromBuffer(buffer: Buffer, type: string): string {
  try {
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000))
    
    // Remove non-printable characters and clean up
    const cleaned = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Extract readable portions (minimum 5 chars for better quality)
    const readable = cleaned.match(/[\x20-\x7E\s]{5,}/g) || []
    
    // Filter out likely non-text content
    const filtered = readable
      .filter(chunk => {
        // Check if chunk has reasonable ratio of letters
        const letters = chunk.match(/[a-zA-Z]/g) || []
        return letters.length / chunk.length > 0.3
      })
      .join(' ')
    
    return filtered.trim() || `Unable to extract text from ${type} file`
  } catch {
    return `Unable to extract text from ${type} file`
  }
}

/**
 * Extract text from DOCX files (which are ZIP archives)
 */
async function extractFromDocx(buffer: Buffer): Promise<string> {
  try {
    // DOCX files contain XML, we'll extract text between specific tags
    const text = buffer.toString('binary')
    
    // Look for document.xml content
    const docStart = text.indexOf('word/document.xml')
    if (docStart === -1) {
      return extractTextFromBuffer(buffer, 'docx')
    }
    
    // Extract text from w:t tags (Word text elements)
    const textMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []
    const extracted = textMatches
      .map(match => match.replace(/<[^>]+>/g, ''))
      .filter(text => text.trim().length > 0)
      .join(' ')
    
    // Also try to extract from simpler text patterns
    if (!extracted) {
      const simpleText = text.match(/>([^<]{2,})</g) || []
      const cleanText = simpleText
        .map(match => match.slice(1, -1))
        .filter(text => /[a-zA-Z]/.test(text))
        .join(' ')
        .trim()
      
      return cleanText || extractTextFromBuffer(buffer, 'docx')
    }
    
    return extracted
  } catch {
    return extractTextFromBuffer(buffer, 'docx')
  }
}

/**
 * Extract text from Excel files
 */
async function extractFromExcel(buffer: Buffer): Promise<string> {
  try {
    const text = buffer.toString('binary')
    
    // Look for sharedStrings.xml (contains cell text in XLSX)
    const hasSharedStrings = text.indexOf('sharedStrings.xml') !== -1
    
    if (hasSharedStrings) {
      // Extract from si/t tags (Excel text elements)
      const textMatches = text.match(/<t[^>]*>([^<]+)<\/t>/g) || []
      const extracted = textMatches
        .map(match => match.replace(/<[^>]+>/g, ''))
        .filter(text => text.trim().length > 0)
      
      // Format as table-like structure
      return extracted.join(' | ') || extractTextFromBuffer(buffer, 'xlsx')
    }
    
    // Fallback for XLS or other formats
    return extractTextFromBuffer(buffer, 'excel')
  } catch {
    return extractTextFromBuffer(buffer, 'excel')
  }
}