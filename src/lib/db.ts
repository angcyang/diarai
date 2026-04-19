import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'diarai.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize database schema
export function initDatabase() {
  // Create entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      mood_score INTEGER CHECK(mood_score >= 1 AND mood_score <= 10),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Create tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('emotion', 'meaning')),
      color TEXT
    )
  `)

  // Create entry_tags junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)

  // Create ai_analyses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      model TEXT NOT NULL,
      summary TEXT,
      emotion TEXT,
      keywords TEXT,
      tags TEXT,
      advice TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    )
  `)

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood_score);
    CREATE INDEX IF NOT EXISTS idx_ai_analyses_entry ON ai_analyses(entry_id);
  `)

  // Initialize default tags if not exist
  initDefaultTags()

  console.log('Database initialized successfully')
}

function initDefaultTags() {
  const emotionTags = [
    { name: '开心', emoji: '😊', color: '#f9e2af' },
    { name: '平静', emoji: '😌', color: '#89b4fa' },
    { name: '焦虑', emoji: '😟', color: '#fab387' },
    { name: '悲伤', emoji: '😢', color: '#6c7086' },
    { name: '愤怒', emoji: '😤', color: '#f38ba8' },
    { name: '感恩', emoji: '🙏', color: '#a6e3a1' },
    { name: '迷芒', emoji: '😕', color: '#cba6f7' },
  ]

  const meaningTags = [
    { name: '积极', emoji: '🌟', color: '#a6e3a1' },
    { name: '日常', emoji: '📅', color: '#bac2de' },
    { name: '社交', emoji: '👥', color: '#89b4fa' },
    { name: '反思', emoji: '🪞', color: '#cba6f7' },
    { name: '挑战', emoji: '⚡', color: '#f9e2af' },
  ]

  const insertTag = db.prepare(
    'INSERT OR IGNORE INTO tags (id, name, type, color) VALUES (?, ?, ?, ?)'
  )

  emotionTags.forEach((tag, i) => {
    insertTag.run(`emotion_${i}`, `${tag.emoji} ${tag.name}`, 'emotion', tag.color)
  })

  meaningTags.forEach((tag, i) => {
    insertTag.run(`meaning_${i}`, `${tag.emoji} ${tag.name}`, 'meaning', tag.color)
  })
}

// Initialize on module load
initDatabase()

export default db
