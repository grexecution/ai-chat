import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

/**
 * POST /api/folders/[id]/verify - Verify folder password
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { password } = await req.json()

    // Get folder with password
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    if (!folder.isPrivate || !folder.passwordHash) {
      return NextResponse.json({ valid: true })
    }

    const isValid = await bcrypt.compare(password, folder.passwordHash)
    
    return NextResponse.json({ valid: isValid })
  } catch (error) {
    logger.error('Failed to verify folder password', error)
    return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 })
  }
}