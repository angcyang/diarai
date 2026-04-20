'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, countWords } from '@/lib/utils'
import { EMOTION_LABELS, MEANING_LABELS } from '@/types'
import { ArrowLeft, Edit, Trash2, Sparkles, Share2 } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

interface Entry {
  id: string
  date: string
  title: string | null
  content: string
  mood_score: number
  tags: { id: string; name: string; type: string; color: string | null }[]
  analysis?: {
    summary: string
    emotion: string
    keywords: string[]
    advice: string
  }
}

export default function DiaryDetailPage() {
  const params = useParams()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchEntry(params.id as string)
    }
  }, [params.id])

  const fetchEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/diary/${id}`)
      const data = await res.json()
      setEntry(data)
    } catch (error) {
      console.error('Failed to fetch entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeEntry = async () => {
    if (!entry) return
    
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entry.id,
          content: entry.content
        })
      })
      const data = await res.json()
      setEntry(prev => prev ? { ...prev, analysis: data } : null)
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const deleteEntry = async () => {
    if (!entry || !confirm('确定要删除这篇日记吗？')) return
    
    try {
      await fetch(`/api/diary/${entry.id}`, { method: 'DELETE' })
      window.location.href = '/diary'
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-subtext0">加载中...</div>
        </div>
      </AppShell>
    )
  }

  if (!entry) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-4">日记不存在</h2>
          <Link href="/diary">
            <Button>返回日记库</Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const emotionTags = entry.tags?.filter(t => t.type === 'emotion') || []
  const meaningTags = entry.tags?.filter(t => t.type === 'meaning') || []

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/diary" className="inline-flex items-center gap-2 text-subtext0 hover:text-text">
          <ArrowLeft className="w-4 h-4" />
          返回日记库
        </Link>

        {/* Main Content */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  {entry.title || '无标题'}
                </CardTitle>
                <p className="text-subtext0 mt-1">
                  {formatDate(entry.date, 'full')} · {countWords(entry.content)} 字
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={analyzeEntry} disabled={isAnalyzing}>
                  <Sparkles className="w-4 h-4" />
                  AI分析
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4" />
                  分享
                </Button>
                <Button variant="destructive" onClick={deleteEntry}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mood Score */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-subtext0">心情评分</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-surface0 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${entry.mood_score * 10}%`,
                      backgroundColor: entry.mood_score >= 7 ? '#a6e3a1' :
                                     entry.mood_score >= 4 ? '#f9e2af' : '#f38ba8'
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{entry.mood_score}/10</span>
              </div>
            </div>

            {/* Tags */}
            {(emotionTags.length > 0 || meaningTags.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {emotionTags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: `${tag.color || '#888'}20`, color: tag.color || '#888' }}
                  >
                    {tag.name}
                  </span>
                ))}
                {meaningTags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: `${tag.color || '#888'}20`, color: tag.color || '#888' }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="markdown-content">
              <ReactMarkdown>{entry.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        {entry.analysis && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI 分析结果
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-subtext0 mb-1">摘要</h4>
                <p>{entry.analysis.summary}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-subtext0 mb-1">识别情绪</h4>
                  <p>{EMOTION_LABELS[entry.analysis.emotion as keyof typeof EMOTION_LABELS]?.emoji} {EMOTION_LABELS[entry.analysis.emotion as keyof typeof EMOTION_LABELS]?.label}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-subtext0 mb-1">关键词</h4>
                  <div className="flex flex-wrap gap-1">
                    {entry.analysis.keywords?.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface0 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {entry.analysis.advice && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">💡 温和建议</h4>
                  <p className="text-subtext1">{entry.analysis.advice}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
