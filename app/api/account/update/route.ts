import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { name } = await req.json()

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response('Name is required', { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return new Response('Internal server error', { status: 500 })
  }
}