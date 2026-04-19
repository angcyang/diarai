'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useState, useEffect } from 'react'
import { MEANING_LABELS } from '@/types'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Radar } from 'recharts'
import { Sparkles, Loader2, Target, Heart, Clock, BookOpen, TrendingUp } from 'lucide-react'

interface Profile {
  moodBase: string
  focusAreas: string[]
  growthTrack: string
  writingHabit: string
}

interface Stats {
  total: { count: number; words: number; avgMood: number; streak: number }
  tags: { name: string; color: string | null; count: number }[]
}

const MEANING_COLORS: Record<string, string> = {
  '🌟 积极': '#a6e3a1',
  '📅 日常': '#bac2de',
  '👥 社交': '#89b4fa',
  '🪞 反思': '#cba6f7',
  '⚡ 挑战': '#f9e2af',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes] = await Promise.all([
        fetch('/api/stats?period=90days')
      ])
      const statsData = await statsRes.json()
      setStats(statsData)

      // Try to get existing profile or generate new one
      if (statsData.total.count > 0) {
        generateProfile(statsData)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setLoading(false)
    }
  }

  const generateProfile = async (statsData?: Stats) => {
    setGenerating(true)
    try {
      // For now, generate profile locally based on stats
      const data = statsData || stats
      if (!data) return

      const avgMood = data.total.avgMood || 5
      const moodBase = avgMood >= 7 ? '积极乐观' : avgMood >= 5 ? '平稳平和' : '需要关注'

      // Calculate meaning distribution
      const meaningCounts: Record<string, number> = {
        '🌟 积极': 0, '📅 日常': 0, '👥 社交': 0, '🪞 反思': 0, '⚡ 挑战': 0
      }
      data.tags.forEach(tag => {
        Object.keys(MEANING_LABELS).forEach(key => {
          if (tag.name.includes(MEANING_LABELS[key as keyof typeof MEANING_LABELS].emoji)) {
            meaningCounts[`${MEANING_LABELS[key as keyof typeof MEANING_LABELS].emoji} ${MEANING_LABELS[key as keyof typeof MEANING_LABELS].label}`] += tag.count
          }
        })
      })

      const focusAreas = Object.entries(meaningCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)

      const growthTrack = data.total.streak >= 7 
        ? '保持良好的记录习惯' 
        : data.total.streak >= 3 
        ? '正在培养记录习惯' 
        : '刚开始记录之旅'

      const writingHabit = data.total.avgMood >= 6 
        ? '记录积极的生活点滴' 
        : '注重情绪梳理和反思'

      setProfile({
        moodBase,
        focusAreas,
        growthTrack,
        writingHabit
      })
    } catch (error) {
      console.error('Failed to generate profile:', error)
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  // Prepare radar data
  const radarData = profile?.focusAreas.map((area, i) => ({
    subject: area.split(' ')[1] || area,
    value: (5 - i) * 2 + 3,
    fullMark: 10
  })) || []

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-subtext0">加载中...</div>
        </div>
      </AppShell>
    )
  }

  if (!stats || stats.total.count === 0) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Card>
            <CardContent className="py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface0 flex items-center justify-center">
                <span className="text-3xl">🪞</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">还没有足够的数据</h2>
              <p className="text-subtext0 mb-6">
                继续写日记，我会根据你的记录生成个性画像
              </p>
              <p className="text-sm text-subtext0">
                当前: {stats?.total.count || 0} 篇日记
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">你的个性画像</h1>
          <p className="text-subtext0">基于 {stats.total.count} 篇日记的分析</p>
        </div>

        {/* Main Profile */}
        <Card className="border-primary/50">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue to-purple flex items-center justify-center">
                <span className="text-2xl">🧑</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">日记主人</h2>
                <p className="text-subtext0">活跃记录者</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink mt-1" />
                  <div>
                    <h3 className="font-medium">情绪基调</h3>
                    <p className="text-subtext0">{profile?.moodBase}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-green mt-1" />
                  <div>
                    <h3 className="font-medium">关注领域</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile?.focusAreas.map((area, i) => (
                        <span key={i} className="px-2 py-1 bg-surface0 rounded text-sm">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-yellow mt-1" />
                  <div>
                    <h3 className="font-medium">成长轨迹</h3>
                    <p className="text-subtext0">{profile?.growthTrack}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-blue mt-1" />
                  <div>
                    <h3 className="font-medium">写作习惯</h3>
                    <p className="text-subtext0">{profile?.writingHabit}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>五维雷达图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#45475a" />
                  <PolarAngleAxis dataKey="subject" stroke="#6c7086" fontSize={12} />
                  <PolarRadiusAxis stroke="#6c7086" fontSize={10} domain={[0, 10]} />
                  <Radar
                    name="你的记录"
                    dataKey="value"
                    stroke="#89b4fa"
                    fill="#89b4fa"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              {Object.entries(MEANING_LABELS).map(([key, info]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                  <span className="text-subtext0">{info.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insight */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-medium mb-2">AI洞察</h3>
                <p className="text-subtext1">
                  你的日记记录显示，你是一个善于观察和反思的人。通过持续记录，
                  你正在建立对自己的深度理解。继续保持这个好习惯，你会发现更多关于自己的故事。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regenerate Button */}
        <div className="text-center">
          <Button variant="outline" onClick={() => generateProfile()} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            重新生成画像
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
