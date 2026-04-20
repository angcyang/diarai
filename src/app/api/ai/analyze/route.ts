import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { analyzeDiary, generateProfile } from '@/lib/ai'
import { AIConfig, AIAnalysis } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entry_id, content } = body

    // Get AI config from env
    const aiConfig: AIConfig = {
      provider: (process.env.AI_PROVIDER as AIConfig['provider']) || 'qwen',
      apiKey: process.env.QWEN_API_KEY || process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.QWEN_BASE_URL,
      model: process.env.AI_MODEL,
    }

    if (!aiConfig.apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 400 })
    }

    // Check for existing analysis with same model
    const existing = db.prepare(`
      SELECT * FROM ai_analyses WHERE entry_id = ? AND model = ?
    `).get(entry_id, aiConfig.model || 'default') as AIAnalysis | undefined

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        entry_id: existing.entry_id,
        model: existing.model,
        summary: existing.summary,
        emotion: existing.emotion,
        keywords: JSON.parse((existing as any).keywords || '[]'),
        tags: JSON.parse((existing as any).tags || '[]'),
        advice: existing.advice,
        created_at: existing.created_at
      })
    }

    // Perform analysis
    const analysis = await analyzeDiary(content, aiConfig)

    // Save to database
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO ai_analyses (id, entry_id, model, summary, emotion, keywords, tags, advice, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry_id,
      aiConfig.model || 'default',
      analysis.summary,
      analysis.emotion,
      JSON.stringify(analysis.keywords),
      JSON.stringify(analysis.suggestedTags),
      analysis.advice,
      now
    )

    return NextResponse.json({
      id,
      ...analysis,
      created_at: now
    })
  } catch (error) {
    console.error('AI analyze error:', error)
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 })
  }
}
