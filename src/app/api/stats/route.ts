import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { MonthlyStats, EmotionDistribution, TagDistribution } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '6months'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    }

    const startDateStr = startDate.toISOString().split('T')[0]

    // Get total stats
    const totalStats = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(LENGTH(content)) as total_words,
        AVG(mood_score) as avg_mood
      FROM entries
      WHERE date >= ?
    `).get(startDateStr) as { total_count: number; total_words: number; avg_mood: number }

    // Get streak
    const dates = db.prepare(`
      SELECT DISTINCT date FROM entries 
      WHERE date <= CURRENT_DATE 
      ORDER BY date DESC
    `).all() as { date: string }[]

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < dates.length; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const checkDateStr = checkDate.toISOString().split('T')[0]
      
      if (dates.some(d => d.date === checkDateStr)) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    // Get monthly stats
    const monthlyData = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COUNT(*) as count,
        SUM(LENGTH(content)) as words,
        AVG(mood_score) as avg_mood
      FROM entries
      WHERE date >= ?
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
    `).all(startDateStr) as MonthlyStats[]

    // Get emotion distribution
    const entries = db.prepare(`
      SELECT mood_score FROM entries WHERE date >= ?
    `).all(startDateStr) as { mood_score: number }[]

    const emotionCounts: Record<string, number> = {
      happy: 0, calm: 0, anxious: 0, sad: 0, angry: 0, grateful: 0, confused: 0
    }

    entries.forEach(({ mood_score }) => {
      if (mood_score >= 8) emotionCounts.happy++
      else if (mood_score >= 6) emotionCounts.calm++
      else if (mood_score >= 4) emotionCounts.anxious++
      else if (mood_score >= 3) emotionCounts.confused++
      else emotionCounts.sad++
    })

    const totalEntries = entries.length || 1
    const emotionDistribution: EmotionDistribution[] = Object.entries(emotionCounts)
      .filter(([_, count]) => count > 0)
      .map(([emotion, count]) => ({
        emotion: emotion as EmotionDistribution['emotion'],
        count,
        percentage: Math.round((count / totalEntries) * 100)
      }))

    // Get tag distribution
    const tagStats = db.prepare(`
      SELECT t.name, t.color, COUNT(*) as count
      FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      JOIN entries e ON et.entry_id = e.id
      WHERE e.date >= ?
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 10
    `).all(startDateStr) as TagDistribution[]

    // Get daily data for charts
    const dailyData = db.prepare(`
      SELECT 
        date,
        COUNT(*) as count,
        AVG(mood_score) as avg_mood,
        SUM(LENGTH(content)) as words
      FROM entries
      WHERE date >= ?
      GROUP BY date
      ORDER BY date
    `).all(startDateStr) as { date: string; count: number; avg_mood: number; words: number }[]

    return NextResponse.json({
      total: {
        count: totalStats.total_count || 0,
        words: totalStats.total_words || 0,
        avgMood: totalStats.avg_mood || 5,
        streak
      },
      monthly: monthlyData,
      emotions: emotionDistribution,
      tags: tagStats,
      daily: dailyData
    })
  } catch (error) {
    console.error('GET stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
