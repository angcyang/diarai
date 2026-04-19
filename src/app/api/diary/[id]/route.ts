import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id)

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
    `).all(id)

    const analysis = db.prepare(`
      SELECT * FROM ai_analyses WHERE entry_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(id)

    return NextResponse.json({ ...entry, tags, analysis })
  } catch (error) {
    console.error('GET entry error:', error)
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { title, content, mood_score, tagIds } = body

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE entries 
      SET title = ?, content = ?, mood_score = ?, updated_at = ?
      WHERE id = ?
    `).run(title || null, content, mood_score || 5, now, id)

    // Update tags if provided
    if (tagIds && Array.isArray(tagIds)) {
      db.prepare('DELETE FROM entry_tags WHERE entry_id = ?').run(id)
      const insertTag = db.prepare('INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)')
      tagIds.forEach((tagId: string) => {
        insertTag.run(id, tagId)
      })
    }

    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
    `).all(id)

    return NextResponse.json({ ...entry, tags })
  } catch (error) {
    console.error('PUT entry error:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    db.prepare('DELETE FROM entries WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE entry error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
