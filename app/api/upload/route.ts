import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateFile } from '@/lib/file-parser'
import { parseFile } from '@/lib/file-parser.server'

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser for file uploads
  },
}

/**
 * Handle file uploads for document parsing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return new Response('No files provided', { status: 400 })
    }

    if (files.length > 5) {
      return new Response('Maximum 5 files allowed', { status: 400 })
    }

    const parsedFiles = []

    for (const file of files) {
      // Validate file
      const validation = validateFile({
        size: file.size,
        type: file.type
      })

      if (!validation.valid) {
        return new Response(validation.error, { status: 400 })
      }

      // Read file buffer
      const buffer = Buffer.from(await file.arrayBuffer())

      // Parse file
      try {
        const parsed = await parseFile(buffer, file.name, file.type)
        parsedFiles.push({
          filename: parsed.filename,
          content: parsed.content,
          metadata: parsed.metadata,
          size: file.size,
          type: file.type
        })
      } catch (error) {
        console.error('File parsing error:', error)
        return new Response(`Failed to parse ${file.name}`, { status: 400 })
      }
    }

    return Response.json({
      success: true,
      files: parsedFiles
    })

  } catch (error) {
    console.error('Upload error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * Get supported file types
 */
export async function GET() {
  const { SUPPORTED_FILE_TYPES } = await import('@/lib/file-parser')
  
  return Response.json({
    supportedTypes: Object.keys(SUPPORTED_FILE_TYPES),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  })
}