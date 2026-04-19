'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import { EMOTION_LABELS } from '@/types'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar
} from 'recharts'
import { TrendingUp, MessageSquare, Calendar, Hash } from 'lucide-react'

interface Stats {
  total: {
    count: number
    words: number
    avgMood: number
    streak: number
  }
  monthly: { month: string; count: number; words: number; avg_mood: number }[]
  emotions: { emotion: string; count: number; percentage: number }[]
  tags: { name: string; color: string | null; count: number }[]
  daily: { date: string; count: number; avg_mood: number; words: number }[]
}

const COLORS = ['#f9e2af', '#89b4fa', '#a6e3a1', '#cba6f7', '#fab387', '#f38ba8', '#94e2d5']

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('6months')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?period=${period}`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-subtext0">加载中...</div>
        </div>
      </AppShell>
    )
  }

  const emotionChartData = stats.emotions.map(e => ({
    name: EMOTION_LABELS[e.emotion as keyof typeof EMOTION_LABELS]?.label || e.emotion,
    value: e.count,
    fill: COLORS[stats.emotions.indexOf(e) % COLORS.length]
  }))

  const monthlyChartData = stats.monthly.map(m => ({
    month: m.month.slice(5),
    count: m.count,
    avgMood: Number(m.avg_mood?.toFixed(1)) || 5
  })).reverse()

  const dailyChartData = stats.daily.map(d => ({
    date: d.date.slice(5),
    count: d.count,
    mood: Number(d.avg_mood?.toFixed(1)) || 5
  }))

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setPeriod('30days')}
            className={`px-4 py-2 rounded-lg text-sm ${period === '30days' ? 'bg-primary text-primary-foreground' : 'bg-surface0'}`}
          >
            30天
          </button>
          <button
            onClick={() => setPeriod('6months')}
            className={`px-4 py-2 rounded-lg text-sm ${period === '6months' ? 'bg-primary text-primary-foreground' : 'bg-surface0'}`}
          >
            6个月
          </button>
          <button
            onClick={() => setPeriod('1year')}
            className={`px-4 py-2 rounded-lg text-sm ${period === '1year' ? 'bg-primary text-primary-foreground' : 'bg-surface0'}`}
          >
            1年
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total.count}</p>
                  <p className="text-sm text-subtext0">日记总数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green/20 flex items-center justify-center">
                  <Hash className="w-6 h-6 text-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total.words.toLocaleString()}</p>
                  <p className="text-sm text-subtext0">累计字数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-yellow" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total.avgMood.toFixed(1)}</p>
                  <p className="text-sm text-subtext0">平均心情</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total.streak}</p>
                  <p className="text-sm text-subtext0">连续天数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trend">情绪趋势</TabsTrigger>
            <TabsTrigger value="distribution">分布统计</TabsTrigger>
            <TabsTrigger value="frequency">写作频率</TabsTrigger>
          </TabsList>

          {/* Emotion Trend */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>情绪趋势图</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#45475a" />
                      <XAxis dataKey="date" stroke="#6c7086" fontSize={12} />
                      <YAxis stroke="#6c7086" fontSize={12} domain={[0, 10]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#313244', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#cdd6f4' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke="#89b4fa"
                        strokeWidth={2}
                        dot={{ fill: '#89b4fa', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>情绪分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={emotionChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {emotionChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#313244', border: 'none', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>标签分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.tags.slice(0, 8).map((tag, i) => (
                      <div key={tag.name} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || COLORS[i % COLORS.length] }}
                        />
                        <span className="flex-1">{tag.name}</span>
                        <span className="text-subtext0">{tag.count}次</span>
                        <div className="w-24 h-2 bg-surface0 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(tag.count / (stats.tags[0]?.count || 1)) * 100}%`,
                              backgroundColor: tag.color || COLORS[i % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Writing Frequency */}
          <TabsContent value="frequency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>月度写作统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#45475a" />
                      <XAxis dataKey="month" stroke="#6c7086" fontSize={12} />
                      <YAxis stroke="#6c7086" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#313244', border: 'none', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#89b4fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
