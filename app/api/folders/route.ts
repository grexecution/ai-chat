import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/folders - Get all folders for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const folders = await prisma.folder.findMany({
      where: { userId: session.user.id },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { conversations: true }
        }
      }
    })

    return NextResponse.json(folders)
  } catch (error) {
    logger.error('Failed to fetch folders', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}

/**
 * POST /api/folders - Create a new folder
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, color, icon } = await req.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get the highest position to add new folder at the end
    const lastFolder = await prisma.folder.findFirst({
      where: { userId: session.user.id },
      orderBy: { position: 'desc' }
    })

    const newPosition = (lastFolder?.position ?? -1) + 1

    const folder = await prisma.folder.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        color: color || '#10b981', // Default emerald color
        icon: icon || '📁',
        position: newPosition
      }
    })

    return NextResponse.json(folder)
  } catch (error) {
    logger.error('Failed to create folder', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}

/**
 * PATCH /api/folders - Update folder positions (for reordering)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folders } = await req.json()

    if (!Array.isArray(folders)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Update all folder positions in a transaction
    await prisma.$transaction(
      folders.map((folder, index) =>
        prisma.folder.update({
          where: {
            id: folder.id,
            userId: session.user.id // Ensure user owns the folder
          },
          data: { position: index }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to update folder positions', error)
    return NextResponse.json({ error: 'Failed to update folder positions' }, { status: 500 })
  }
}