import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // First verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!conversation) {
      return new Response('Conversation not found', { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        metadata: true,
      },
    })

    return Response.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await params
    const { role, content } = await req.json()

    if (!role || !content) {
      return new Response('Role and content are required', { status: 400 })
    }

    if (!['user', 'assistant'].includes(role)) {
      return new Response('Invalid role', { status: 400 })
    }

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!conversation) {
      return new Response('Conversation not found', { status: 404 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role,
        content,
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        metadata: true,
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: id },
      data: { updatedAt: new Date() },
    })

    return Response.json(message)
  } catch (error) {
    console.error('Error creating message:', error)
    return new Response('Internal server error', { status: 500 })
  }
}