import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Get file attachment data for download/preview
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messageId } = await params
    const { filename } = Object.fromEntries(req.nextUrl.searchParams)

    if (!filename) {
      return new Response('Filename required', { status: 400 })
    }

    // Get message with metadata
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId: session.user.id
        }
      },
      select: {
        metadata: true
      }
    })

    if (!message) {
      return new Response('Message not found', { status: 404 })
    }

    // Extract file content from metadata
    const metadata = message.metadata as any
    const files = metadata?.files || []
    const file = files.find((f: any) => f.filename === filename)

    if (!file) {
      return new Response('File not found', { status: 404 })
    }

    // For now, return the file metadata and content as JSON
    // In a full implementation, you'd reconstruct the actual file
    return Response.json({
      filename: file.filename,
      type: file.type,
      content: file.content || 'File content not available for preview',
      size: file.size
    })

  } catch (error) {
    console.error('File retrieval error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}