import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'

let db: SqlJsDatabase | null = null
let initPromise: Promise<void> | null = null

const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'diarai.db')

// Helper to prepare and run statements
function run(sql: string, params: unknown[] = []) {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  stmt.free()
}

// Helper to get one row
function get(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row: Record<string, unknown> = {}
    const cols = stmt.getColumnNames()
    const vals = stmt.get()
    cols.forEach((col, i) => { row[col] = vals[i] })
    stmt.free()
    return row
  }
  stmt.free()
  return undefined
}

// Helper to get all rows
function all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  if (!db) throw new Error('Database not initialized')
  const results: Record<string, unknown>[] = []
  const stmt = db.prepare(sql)
  stmt.bind(params)
  while (stmt.step()) {
    const row: Record<string, unknown> = {}
    const cols = stmt.getColumnNames()
    const vals = stmt.get()
    cols.forEach((col, i) => { row[col] = vals[i] })
    results.push(row)
  }
  stmt.free()
  return results
}

// Save database to file
function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

async function initDatabase(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('emotion', 'meaning')),
      color TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)

  db.run(`
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

  db.run('CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)')
  db.run('CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood_score)')
  db.run('CREATE INDEX IF NOT EXISTS idx_ai_analyses_entry ON ai_analyses(entry_id)')

  initDefaultTags()
  saveDb()

  console.log('Database initialized successfully')
}

function initDefaultTags() {
  if (!db) return

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

  emotionTags.forEach((tag, i) => {
    run(
      'INSERT OR IGNORE INTO tags (id, name, type, color) VALUES (?, ?, ?, ?)',
      [`emotion_${i}`, `${tag.emoji} ${tag.name}`, 'emotion', tag.color]
    )
  })

  meaningTags.forEach((tag, i) => {
    run(
      'INSERT OR IGNORE INTO tags (id, name, type, color) VALUES (?, ?, ?, ?)',
      [`meaning_${i}`, `${tag.emoji} ${tag.name}`, 'meaning', tag.color]
    )
  })
}

async function ensureInit() {
  if (db) return
  if (!initPromise) {
    initPromise = initDatabase()
  }
  await initPromise
}

const dbWrapper = {
  prepare: (sql: string) => ({
    run: (...params: unknown[]) => { run(sql, params); saveDb() },
    get: (...params: unknown[]) => get(sql, params),
    all: (...params: unknown[]) => all(sql, params),
  }),
  exec: (sql: string) => { db?.run(sql); saveDb() },
  ensureInit,
}

export default dbWrapper
export { initDatabase }
