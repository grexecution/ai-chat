import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchWeb } from '@/lib/web-search'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const results = await searchWeb(query, limit)
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Web search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}