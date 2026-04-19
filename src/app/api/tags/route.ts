import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let query = 'SELECT * FROM tags'
    const params: string[] = []

    if (type) {
      query += ' WHERE type = ?'
      params.push(type)
    }

    query += ' ORDER BY type, name'

    const tags = db.prepare(query).all(...params)

    // Get usage count for each tag
    const tagsWithCount = tags.map((tag: { id: string; name: string; type: string; color: string | null }) => {
      const { count } = db.prepare(`
        SELECT COUNT(*) as count FROM entry_tags WHERE tag_id = ?
      `).get(tag.id) as { count: number }
      return { ...tag, count }
    })

    return NextResponse.json(tagsWithCount)
  } catch (error) {
    console.error('GET tags error:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, color } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    if (!['emotion', 'meaning'].includes(type)) {
      return NextResponse.json({ error: 'Type must be emotion or meaning' }, { status: 400 })
    }

    const id = uuidv4()

    try {
      db.prepare(`
        INSERT INTO tags (id, name, type, color) VALUES (?, ?, ?, ?)
      `).run(id, name, type, color || null)

      const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id)
      return NextResponse.json(tag, { status: 201 })
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
        return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 })
      }
      throw err
    }
  } catch (error) {
    console.error('POST tag error:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    db.prepare('DELETE FROM tags WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE tag error:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
