import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

/**
 * PATCH /api/folders/[id] - Update a folder
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, color, icon, isExpanded, isPrivate, currentPassword, password } = await req.json()

    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // If folder was private and still is private, verify current password
    if (folder.isPrivate && folder.passwordHash && isPrivate) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to modify a private folder' }, { status: 400 })
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, folder.passwordHash)
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 })
      }
    }

    // Handle password update for private folders
    let passwordHash = folder.passwordHash
    if (isPrivate) {
      // If a new password is provided, hash it
      if (password) {
        passwordHash = await bcrypt.hash(password, 10)
      }
      // Otherwise keep the existing password hash
    } else {
      // If folder is no longer private, remove password
      passwordHash = null
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(isExpanded !== undefined && { isExpanded }),
        ...(isPrivate !== undefined && { isPrivate }),
        ...(passwordHash !== undefined && { passwordHash })
      }
    })

    return NextResponse.json(updatedFolder)
  } catch (error) {
    logger.error('Failed to update folder', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

/**
 * DELETE /api/folders/[id] - Delete a folder
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify folder ownership and check for conversations
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: { conversations: true }
        }
      }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Delete the folder (conversations will have folderId set to null due to onDelete: SetNull)
    await prisma.folder.delete({
      where: { id }
    })

    // Reorder remaining folders
    const remainingFolders = await prisma.folder.findMany({
      where: { userId: session.user.id },
      orderBy: { position: 'asc' }
    })

    await prisma.$transaction(
      remainingFolders.map((folder, index) =>
        prisma.folder.update({
          where: { id: folder.id },
          data: { position: index }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete folder', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}