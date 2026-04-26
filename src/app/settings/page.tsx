'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState, useEffect } from 'react'
import { Settings, Key, Database, Download, Upload, Trash2, Loader2, CheckCircle, XCircle, Wifi } from 'lucide-react'

// AI 提供商配置
const AI_PROVIDERS = {
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo'
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    defaultModel: ''
  }
}

type ProviderType = keyof typeof AI_PROVIDERS

export default function SettingsPage() {
  const [aiProvider, setAiProvider] = useState<ProviderType>('qwen')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(AI_PROVIDERS.qwen.baseUrl)
  const [aiModel, setAiModel] = useState(AI_PROVIDERS.qwen.defaultModel)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testMessage, setTestMessage] = useState('')

  // 加载已保存的设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('diarai-ai-config')
    if (savedSettings) {
      const config = JSON.parse(savedSettings) as { provider?: ProviderType; apiKey?: string; baseUrl?: string; model?: string }
      const provider = config.provider || 'qwen'
      setAiProvider(provider)
      setApiKey(config.apiKey || '')
      setBaseUrl(config.baseUrl || AI_PROVIDERS[provider].baseUrl)
      setAiModel(config.model || AI_PROVIDERS[provider].defaultModel)
    }
  }, [])

  // 切换提供商时更新默认值
  const handleProviderChange = (provider: ProviderType) => {
    setAiProvider(provider)
    setBaseUrl(AI_PROVIDERS[provider].baseUrl)
    setAiModel(AI_PROVIDERS[provider].defaultModel)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    
    localStorage.setItem('diarai-ai-config', JSON.stringify({
      provider: aiProvider,
      apiKey,
      baseUrl,
      model: aiModel
    }))
    
    await new Promise(resolve => setTimeout(resolve, 500))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // 真实的 API 连接测试
  const testConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult('error')
      setTestMessage('请先输入 API Key')
      return
    }
    
    setTesting(true)
    setTestResult(null)
    setTestMessage('正在测试连接...')
    
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey,
          baseUrl,
          model: aiModel
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setTestResult('success')
        setTestMessage('连接成功！')
      } else {
        setTestResult('error')
        setTestMessage(data.error || '连接失败')
      }
    } catch (error) {
      setTestResult('error')
      setTestMessage('网络错误，请检查网络连接')
    } finally {
      setTesting(false)
    }
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
        URL.revokeObjectURL(url)
      } else {
        let md = '# DiarAI 日记导出\n\n'
        md += `导出时间: ${new Date().toLocaleString()}\n\n`
        data.entries?.forEach((entry: { title: string; date: string; content: string; mood_score: number }) => {
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
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // 导入数据
  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (Array.isArray(data)) {
          // 批量导入日记
          for (const entry of data) {
            await fetch('/api/diary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry)
            })
          }
          alert(`成功导入 ${data.length} 篇日记`)
        } else {
          alert('文件格式不正确')
        }
      } catch (error) {
        alert('导入失败：' + (error as Error).message)
      }
    }
    input.click()
  }

  const clearData = async () => {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return
    
    try {
      localStorage.clear()
      // 调用 API 清除数据库
      await fetch('/api/diary?action=clear', { method: 'DELETE' })
      alert('数据已清除')
      window.location.reload()
    } catch (error) {
      console.error('Clear error:', error)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* AI 配置 - 简化版 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              🤖 AI 模型配置
            </CardTitle>
            <CardDescription>配置AI服务以启用智能功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI 名称 */}
            <div>
              <label className="text-sm font-medium mb-2 block">AI 服务</label>
              <select
                value={aiProvider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full h-10 px-3 rounded-lg border border-surface0 bg-background"
              >
                <option value="qwen">通义千问</option>
                <option value="deepseek">DeepSeek</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            {/* API 地址 - 可修改的默认值 */}
            <div>
              <label className="text-sm font-medium mb-2 block">Base URL</label>
              <Input
                placeholder="https://api.example.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-subtext0 mt-1">
                {aiProvider === 'qwen' && '默认: https://dashscope.aliyuncs.com/compatible-mode/v1'}
                {aiProvider === 'deepseek' && '默认: https://api.deepseek.com/v1'}
                {aiProvider === 'custom' && '请输入你的 API 地址'}
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <Input
                type="password"
                placeholder="输入你的 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {/* 测试连接 */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                测试连接
              </Button>
              {testResult === 'success' && (
                <span className="flex items-center gap-1 text-green">
                  <CheckCircle className="w-4 h-4" /> {testMessage}
                </span>
              )}
              {testResult === 'error' && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="w-4 h-4" /> {testMessage}
                </span>
              )}
            </div>

            {/* 保存按钮 */}
            <div className="flex gap-3 pt-4 border-t border-surface0">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                保存配置
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-green">
                  <CheckCircle className="w-4 h-4" /> 已保存
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 数据备份 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              数据备份
            </CardTitle>
            <CardDescription>导出或导入你的日记数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => exportData('json')}>
                <Download className="w-4 h-4" />
                导出 JSON
              </Button>
              <Button variant="outline" onClick={() => exportData('markdown')}>
                <Download className="w-4 h-4" />
                导出 Markdown
              </Button>
              <Button variant="outline" onClick={importData}>
                <Upload className="w-4 h-4" />
                导入数据
              </Button>
            </div>
            
            <div className="pt-4 border-t border-surface0">
              <h4 className="text-sm font-medium mb-2 text-destructive">危险操作</h4>
              <Button variant="destructive" onClick={clearData}>
                <Trash2 className="w-4 h-4" />
                清除所有数据
              </Button>
              <p className="text-xs text-subtext0 mt-2">
                此操作将永久删除所有日记和设置
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 关于 */}
        <Card>
          <CardHeader>
            <CardTitle>关于 DiarAI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-subtext0">
              <p>版本: 1.0.0</p>
              <p>技术栈: Next.js 14 + SQLite + Tailwind CSS</p>
              <p className="pt-2">
                DiarAI 是一款注重隐私的 AI 日记工具，所有数据都存储在本地。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
