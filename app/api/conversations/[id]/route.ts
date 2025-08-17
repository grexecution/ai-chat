import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!conversation) {
      return new Response('Conversation not found', { status: 404 })
    }

    return Response.json(conversation)
  } catch (error) {
    logger.error('Error fetching conversation', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await params
    const { title, folderId } = await req.json()

    if (!title && folderId === undefined) {
      return new Response('Title or folderId is required', { status: 400 })
    }

    // Verify folder ownership if folderId is provided
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.user.id
        }
      })
      
      if (!folder) {
        return new Response('Invalid folder', { status: 400 })
      }
    }

    const updateData: { title?: string; folderId?: string | null } = {}
    if (title !== undefined) updateData.title = title
    if (folderId !== undefined) updateData.folderId = folderId

    const conversation = await prisma.conversation.updateMany({
      where: {
        id: id,
        userId: session.user.id,
      },
      data: updateData,
    })

    if (conversation.count === 0) {
      return new Response('Conversation not found', { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    logger.error('Error updating conversation', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.conversation.deleteMany({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (conversation.count === 0) {
      return new Response('Conversation not found', { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    logger.error('Error deleting conversation', error)
    return new Response('Internal server error', { status: 500 })
  }
}