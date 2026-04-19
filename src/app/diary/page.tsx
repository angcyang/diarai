'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useState, useEffect } from 'react'
import { formatDate, groupByDate } from '@/lib/utils'
import { EMOTION_LABELS, MEANING_LABELS } from '@/types'
import { Search, Calendar, Filter, Grid, List, Trash2, Eye, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface Entry {
  id: string
  date: string
  title: string | null
  content: string
  mood_score: number
  tags: { id: string; name: string; type: string; color: string | null }[]
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterEmotion, setFilterEmotion] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [filterMonth, filterEmotion])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterMonth) params.set('month', filterMonth)
      if (filterEmotion) params.set('emotion', filterEmotion)
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/diary?${params}`)
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (error) {
      console.error('Failed to fetch entries:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEntries()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const deleteEntry = async (id: string) => {
    if (!confirm('确定要删除这篇日记吗？')) return
    
    try {
      await fetch(`/api/diary/${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const getEmotionColor = (score: number): string => {
    if (score >= 8) return '#f9e2af' // yellow
    if (score >= 6) return '#89b4fa' // blue
    if (score >= 4) return '#fab387' // orange
    return '#f38ba8' // red
  }

  const filteredEntries = entries.filter(e => {
    if (search && !e.title?.includes(search) && !e.content.includes(search)) {
      return false
    }
    return true
  })

  const groupedEntries = groupByDate(filteredEntries)

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext0" />
                <Input
                  placeholder="搜索日记..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-subtext0" />
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-40"
                />
              </div>

              {/* Emotion Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-subtext0" />
                <select
                  value={filterEmotion}
                  onChange={(e) => setFilterEmotion(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-surface0 bg-background text-sm"
                >
                  <option value="">全部情绪</option>
                  <option value="happy">😊 开心</option>
                  <option value="calm">😌 平静</option>
                  <option value="anxious">😟 焦虑</option>
                  <option value="sad">😢 悲伤</option>
                  <option value="angry">😤 愤怒</option>
                  <option value="grateful">🙏 感恩</option>
                  <option value="confused">😕 迷芒</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-surface0 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-background' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-background' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries */}
        {loading ? (
          <div className="text-center py-12 text-subtext0">加载中...</div>
        ) : filteredEntries.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface0 flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-lg font-medium mb-2">还没有日记</h3>
              <p className="text-subtext0">开始写第一篇日记吧！</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map(entry => (
              <Card key={entry.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium line-clamp-1">
                        {entry.title || '无标题'}
                      </h3>
                      <p className="text-sm text-subtext0">
                        {formatDate(entry.date, 'short')}
                      </p>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getEmotionColor(entry.mood_score) }}
                      title={`心情评分: ${entry.mood_score}/10`}
                    />
                  </div>

                  <p className="text-sm text-subtext1 line-clamp-3">
                    {entry.content}
                  </p>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-surface0">
                    <Link
                      href={`/diary/${entry.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      查看详情
                    </Link>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-sm text-destructive hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEntries).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dayEntries]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-subtext0 mb-3 sticky top-0 bg-base py-2">
                  {formatDate(date, 'full')}
                </h3>
                <div className="space-y-2">
                  {dayEntries.map(entry => (
                    <Card key={entry.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-2 h-2 rounded-full mt-2"
                            style={{ backgroundColor: getEmotionColor(entry.mood_score) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium">
                                {entry.title || '无标题'}
                              </h3>
                              <span className="text-sm text-subtext0">
                                {entry.mood_score}/10
                              </span>
                            </div>
                            <p className="text-sm text-subtext1 line-clamp-2 mt-1">
                              {entry.content}
                            </p>
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {entry.tags.map(tag => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-0.5 rounded text-xs"
                                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/diary/${entry.id}`}
                              className="p-2 hover:bg-surface0 rounded-lg"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-2 hover:bg-surface0 rounded-lg text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
