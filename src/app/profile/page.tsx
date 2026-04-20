'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useState, useEffect } from 'react'
import { MEANING_LABELS } from '@/types'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Radar } from 'recharts'
import { Sparkles, Loader2, Target, Heart, Clock, BookOpen, TrendingUp, FileText, Calendar } from 'lucide-react'

interface Profile {
  moodBase: string
  focusAreas: string[]
  growthTrack: string
  writingHabit: string
}

interface Stats {
  total: { count: number; words: number; avgMood: number; streak: number }
  tags: { name: string; color: string | null; count: number }[]
  monthly?: { month: string; count: number; words: number; avg_mood: number }[]
  emotions?: { emotion: string; count: number; percentage: number }[]
}

interface AIReport {
  title: string
  content: string
  generatedAt: string
}

interface MonthlySummary {
  month: string
  totalDiaries: number
  totalWords: number
  avgMood: number
  topEmotions: string[]
  summary: string
  highlights: string[]
}

const MEANING_COLORS: Record<string, string> = {
  '🌟 积极': '#a6e3a1',
  '📅 日常': '#bac2de',
  '👥 社交': '#89b4fa',
  '🪞 反思': '#cba6f7',
  '⚡ 挑战': '#f9e2af',
}

// 加载 AI 配置
function getAIConfig() {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem('diarai-ai-config')
  return saved ? JSON.parse(saved) : null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [diaries, setDiaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [aiReport, setAiReport] = useState<AIReport | null>(null)
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([])
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, diaryRes] = await Promise.all([
        fetch('/api/stats?period=90days'),
        fetch('/api/diary?limit=100')
      ])
      const statsData = await statsRes.json()
      const diaryData = await diaryRes.json()
      
      setStats(statsData)
      setDiaries(diaryData.entries || [])
      
      // 从 localStorage 加载已保存的报告
      const savedReport = localStorage.getItem('diarai-ai-report')
      if (savedReport) {
        setAiReport(JSON.parse(savedReport))
      }
      
      const savedSummaries = localStorage.getItem('diarai-monthly-summaries')
      if (savedSummaries) {
        setMonthlySummaries(JSON.parse(savedSummaries))
      }

      if (statsData.total.count > 0) {
        generateProfile(statsData, diaryData.entries || [])
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setLoading(false)
    }
  }

  // 使用 AI 生成真实的个性画像
  const generateProfile = async (statsData?: Stats, diaryList?: any[]) => {
    setGenerating(true)
    try {
      const data = statsData || stats
      const diaryEntries = diaryList || diaries
      if (!data) return

      const aiConfig = getAIConfig()
      
      if (aiConfig?.apiKey) {
        // 调用 AI 生成分析
        try {
          const response = await fetch('/api/ai/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              diaries: (diaryEntries || []).slice(0, 20),
              config: aiConfig
            })
          })
          
          if (response.ok) {
            const aiResult = await response.json()
            setProfile(aiResult)
          } else {
            setProfile(generateLocalProfile(data, diaryEntries))
          }
        } catch {
          setProfile(generateLocalProfile(data, diaryEntries))
        }
      } else {
        setProfile(generateLocalProfile(data, diaryEntries))
      }
    } catch (error) {
      console.error('Failed to generate profile:', error)
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  // 本地生成画像（后备方案）
  const generateLocalProfile = (data: Stats, diaryList: any[]): Profile => {
    const avgMood = data.total.avgMood || 5
    const moodBase = avgMood >= 7 ? '积极乐观' : avgMood >= 5 ? '平稳平和' : '需要关注'

    const meaningCounts: Record<string, number> = {
      '🌟 积极': 0, '📅 日常': 0, '👥 社交': 0, '🪞 反思': 0, '⚡ 挑战': 0
    }
    data.tags?.forEach(tag => {
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

    return { moodBase, focusAreas, growthTrack, writingHabit }
  }

  // 生成 AI 报告
  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const aiConfig = getAIConfig()
      
      if (!aiConfig?.apiKey) {
        alert('请先在设置中配置 AI API Key')
        setGenerating(false)
        return
      }

      const response = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diaries: diaries.slice(0, 30),
          config: aiConfig
        })
      })

      if (response.ok) {
        const report = await response.json()
        setAiReport(report)
        localStorage.setItem('diarai-ai-report', JSON.stringify(report))
      } else {
        alert('生成报告失败，请检查 AI 配置')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('生成报告失败')
    } finally {
      setGenerating(false)
    }
  }

  // 生成月度总结
  const handleGenerateMonthlySummary = async () => {
    setGenerating(true)
    try {
      const aiConfig = getAIConfig()
      
      if (!aiConfig?.apiKey) {
        alert('请先在设置中配置 AI API Key')
        setGenerating(false)
        return
      }

      // 按月份分组日记
      const byMonth: Record<string, any[]> = {}
      diaries.forEach(d => {
        const month = d.date?.slice(0, 7) || 'unknown'
        if (!byMonth[month]) byMonth[month] = []
        byMonth[month].push(d)
      })

      const summaries: MonthlySummary[] = []
      
      for (const [month, monthDiaries] of Object.entries(byMonth).slice(0, 3)) {
        const response = await fetch('/api/ai/monthly-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month,
            diaries: monthDiaries,
            config: aiConfig
          })
        })

        if (response.ok) {
          const summary = await response.json()
          summaries.push(summary)
        }
      }

      setMonthlySummaries(summaries)
      localStorage.setItem('diarai-monthly-summaries', JSON.stringify(summaries))
    } catch (error) {
      console.error('Failed to generate monthly summary:', error)
      alert('生成月度总结失败')
    } finally {
      setGenerating(false)
    }
  }

  const radarData = profile?.focusAreas.map((area, i) => ({
    subject: area.split(' ')[1] || area,
    value: (5 - i) * 2 + 3,
    fullMark: 10
  })) || []

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-subtext0 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            加载中...
          </div>
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
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">个性分析</h1>
          <p className="text-subtext0">基于 {stats.total.count} 篇日记的分析</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <Target className="w-4 h-4 mr-1" />
              个性画像
            </TabsTrigger>
            <TabsTrigger value="report">
              <FileText className="w-4 h-4 mr-1" />
              AI 报告
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <Calendar className="w-4 h-4 mr-1" />
              月度总结
            </TabsTrigger>
          </TabsList>

          {/* 个性画像 */}
          <TabsContent value="profile" className="space-y-6">
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

            <div className="text-center">
              <Button variant="outline" onClick={() => generateProfile()} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                重新生成画像
              </Button>
            </div>
          </TabsContent>

          {/* AI 报告 */}
          <TabsContent value="report" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  AI 个性分析报告
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!aiReport ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                    <p className="text-subtext0 mb-4">
                      AI 将根据你的日记内容，生成一份深入的性格分析报告
                    </p>
                    <Button onClick={handleGenerateReport} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          生成 AI 报告
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-surface0/50 rounded-lg">
                      <h3 className="font-medium mb-2">{aiReport.title}</h3>
                      <p className="text-sm text-subtext1 whitespace-pre-wrap">{aiReport.content}</p>
                      <p className="text-xs text-subtext0 mt-4">
                        生成时间: {new Date(aiReport.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleGenerateReport} disabled={generating}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        重新生成
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 月度总结 */}
          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  月度总结
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {monthlySummaries.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                    <p className="text-subtext0 mb-4">
                      生成月度总结，回顾每月的心情变化和重要事件
                    </p>
                    <Button onClick={handleGenerateMonthlySummary} disabled={generating || diaries.length < 5}>
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          生成月度总结
                        </>
                      )}
                    </Button>
                    {diaries.length < 5 && (
                      <p className="text-xs text-subtext0 mt-2">
                        需要至少 5 篇日记才能生成月度总结
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {monthlySummaries.map((summary, i) => (
                      <div key={i} className="p-4 bg-surface0/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {summary.month} 月度总结
                          </h3>
                          <span className="text-sm text-subtext0">
                            {summary.totalDiaries} 篇 · {summary.totalWords} 字
                          </span>
                        </div>
                        <p className="text-sm text-subtext1 whitespace-pre-wrap">{summary.summary}</p>
                        {summary.highlights && summary.highlights.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium mb-1">亮点回顾:</p>
                            <ul className="text-sm text-subtext1 space-y-1">
                              {summary.highlights.map((h, j) => (
                                <li key={j} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleGenerateMonthlySummary} disabled={generating}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        重新生成
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
