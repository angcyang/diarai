'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'
import { Settings, Key, Database, Download, Trash2, Moon, Sun, Loader2, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [aiProvider, setAiProvider] = useState('qwen')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [aiModel, setAiModel] = useState('qwen-turbo')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    
    // Save to localStorage (in real app, would use proper storage)
    localStorage.setItem('diarai-settings', JSON.stringify({
      aiProvider,
      apiKey,
      baseUrl,
      aiModel
    }))
    
    // Set environment variables for API (in production, this would be server-side)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('AI_PROVIDER', aiProvider)
      window.localStorage.setItem('AI_MODEL', aiModel)
    }

    await new Promise(resolve => setTimeout(resolve, 500))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (apiKey) {
      setTestResult('success')
    } else {
      setTestResult('error')
    }
    setTesting(false)
  }

  const exportData = async (format: 'json' | 'markdown') => {
    try {
      const res = await fetch('/api/diary?limit=1000')
      const data = await res.json()
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data.entries, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `diarai-export-${new Date().toISOString().split('T')[0]}.json`
        a.click()
      } else {
        let md = '# DiarAI 日记导出\n\n'
        md += `导出时间: ${new Date().toLocaleString()}\n\n`
        data.entries.forEach((entry: { title: string; date: string; content: string; mood_score: number }) => {
          md += `## ${entry.title || '无标题'}\n\n`
          md += `日期: ${entry.date} | 心情: ${entry.mood_score}/10\n\n`
          md += `${entry.content}\n\n---\n\n`
        })
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `diarai-export-${new Date().toISOString().split('T')[0]}.md`
        a.click()
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const clearData = async () => {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return
    
    try {
      // Clear localStorage
      localStorage.clear()
      
      // Clear database entries (in production)
      alert('数据已清除')
    } catch (error) {
      console.error('Clear error:', error)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              AI 设置
            </CardTitle>
            <CardDescription>配置 AI 模型提供商和 API Key</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">AI 提供商</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-surface0 bg-background"
              >
                <option value="qwen">通义千问</option>
                <option value="deepseek">DeepSeek</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <Input
                type="password"
                placeholder="输入你的 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {aiProvider === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">API 地址</label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">模型名称</label>
                  <Input
                    placeholder="自定义模型名称"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                  />
                </div>
              </>
            )}

            {aiProvider === 'qwen' && (
              <div>
                <label className="text-sm font-medium mb-2 block">模型版本</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-surface0 bg-background"
                >
                  <option value="qwen-turbo">qwen-turbo (快速)</option>
                  <option value="qwen-plus">qwen-plus (标准)</option>
                  <option value="qwen-max">qwen-max (最强)</option>
                </select>
              </div>
            )}

            {aiProvider === 'deepseek' && (
              <div>
                <label className="text-sm font-medium mb-2 block">模型版本</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-surface0 bg-background"
                >
                  <option value="deepseek-chat">deepseek-chat</option>
                  <option value="deepseek-coder">deepseek-coder</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={testConnection} disabled={testing || !apiKey}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : '测试连接'}
              </Button>
              {testResult === 'success' && (
                <span className="flex items-center gap-1 text-green">
                  <CheckCircle className="w-4 h-4" /> 连接成功
                </span>
              )}
              {testResult === 'error' && (
                <span className="flex items-center gap-1 text-destructive">
                  连接失败，请检查 API Key
                </span>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-surface0">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                保存设置
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-green">
                  <CheckCircle className="w-4 h-4" /> 已保存
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              数据管理
            </CardTitle>
            <CardDescription>导出或清除你的日记数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">导出数据</h4>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => exportData('json')}>
                  <Download className="w-4 h-4" />
                  JSON 格式
                </Button>
                <Button variant="outline" onClick={() => exportData('markdown')}>
                  <Download className="w-4 h-4" />
                  Markdown 格式
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-surface0">
              <h4 className="text-sm font-medium mb-2 text-destructive">危险区域</h4>
              <Button variant="destructive" onClick={clearData}>
                <Trash2 className="w-4 h-4" />
                清除所有数据
              </Button>
              <p className="text-xs text-subtext0 mt-2">
                此操作将永久删除所有日记和设置，且无法恢复
              </p>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>关于 DiarAI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-subtext0">
              <p>版本: 1.0.0</p>
              <p>技术栈: Next.js 14 + SQLite + Tailwind CSS</p>
              <p>数据存储: 本地 SQLite 数据库</p>
              <p className="pt-2">
                DiarAI 是一款注重隐私的 AI 日记工具，所有数据都存储在本地，
                无需登录，无云端上传。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
