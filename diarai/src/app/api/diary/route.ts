import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { Entry } from '@/types'

export async function GET(request: NextRequest) {
  try {
    await db.ensureInit()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const month = searchParams.get('month')
    const search = searchParams.get('search')
    const emotion = searchParams.get('emotion')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = 'SELECT * FROM entries WHERE 1=1'
    const params: (string | number)[] = []

    if (date) {
      query += ' AND date = ?'
      params.push(date)
    }

    if (month) {
      query += ' AND date LIKE ?'
      params.push(`${month}%`)
    }

    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (emotion) {
      // Filter by mood score range for emotion
      const moodRanges: Record<string, [number, number]> = {
        happy: [7, 10],
        calm: [5, 7],
        anxious: [3, 5],
        sad: [1, 3],
        angry: [1, 3],
        grateful: [7, 10],
        confused: [3, 6],
      }
      const range = moodRanges[emotion]
      if (range) {
        query += ' AND mood_score >= ? AND mood_score <= ?'
        params.push(range[0], range[1])
      }
    }

    query += ' ORDER BY date DESC, created_at DESC'
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const entries = db.prepare(query).all(...params) as Entry[]

    // Get tags for each entry
    const tagQuery = db.prepare(`
      SELECT t.* FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
    `)

    const entriesWithTags = entries.map(entry => {
      const tags = tagQuery.all(entry.id)
      return { ...entry, tags }
    })

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM entries WHERE 1=1'
    const countParams: string[] = []
    
    if (date) {
      countQuery += ' AND date = ?'
      countParams.push(date)
    }
    if (month) {
      countQuery += ' AND date LIKE ?'
      countParams.push(`${month}%`)
    }
    if (search) {
      countQuery += ' AND (title LIKE ? OR content LIKE ?)'
      countParams.push(`%${search}%`, `%${search}%`)
    }

    const { count } = db.prepare(countQuery).get(...countParams) as { count: number }

    return NextResponse.json({
      entries: entriesWithTags,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('GET entries error:', error)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.ensureInit()
    const body = await request.json()
    const { date, title, content, mood_score, tagIds } = body

    if (!date || !content) {
      return NextResponse.json({ error: 'Date and content are required' }, { status: 400 })
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO entries (id, date, title, content, mood_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, title || null, content, mood_score || 5, now, now)

    // Add tags if provided
    if (tagIds && Array.isArray(tagIds)) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)')
      tagIds.forEach((tagId: string) => {
        insertTag.run(id, tagId)
      })
    }

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Entry
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
    `).all(id)

    return NextResponse.json({ ...entry, tags }, { status: 201 })
  } catch (error) {
    console.error('POST entry error:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await db.ensureInit()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    db.prepare('DELETE FROM entries WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE entry error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
