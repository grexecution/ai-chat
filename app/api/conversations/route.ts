import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        model: true,
        folderId: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true
          }
        }
      },
    })

    return Response.json(conversations)
  } catch (error) {
    logger.error('Error fetching conversations', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { title, model, folderId } = await req.json()

    if (!title || !model) {
      return new Response('Title and model are required', { status: 400 })
    }

    // Verify folder ownership if folderId is provided
    if (folderId) {
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

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title,
        model,
        folderId,
      },
      select: {
        id: true,
        title: true,
        model: true,
        folderId: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true
          }
        }
      },
    })

    return Response.json(conversation)
  } catch (error) {
    logger.error('Error creating conversation', error)
    return new Response('Internal server error', { status: 500 })
  }
}