'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useState, useEffect } from 'react'
import { formatDate, getDateString, countWords } from '@/lib/utils'
import { Send, Sparkles, BookOpen, ChevronRight, Loader2, FileText, Upload, PenLine } from 'lucide-react'

interface Tag {
  id: string
  name: string
  type: string
  color: string | null
}

interface GuideMessage {
  type: 'ai' | 'user'
  content: string
}

// 功能说明
const FEATURES = {
  write: {
    title: '✏️ 自由写作',
    description: '直接记录今天发生的事情，抒发内心感受',
    icon: PenLine
  },
  guide: {
    title: '💬 AI引导',
    description: '通过AI对话引导，深入挖掘今天的经历和感受',
    icon: Sparkles
  },
  import: {
    title: '📂 导入日记',
    description: '从JSON文件批量导入之前导出的日记',
    icon: Upload
  }
}

export default function WritePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [moodScore, setMoodScore] = useState(5)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isSaving, setIsSaving] = useState(false)
  
  // AI引导相关状态
  const [isGuiding, setIsGuiding] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>([])
  const [userInput, setUserInput] = useState('')
  
  // 导入相关状态
  const [isImporting, setIsImporting] = useState(false)
  
  const [showSuccess, setShowSuccess] = useState(false)

  // Mood color map
  const moodColors: { [key: number]: string } = {
    1: '#f38ba8', 2: '#f38ba8', 3: '#fab387',
    4: '#f9e2af', 5: '#f9e2af', 6: '#a6e3a1',
    7: '#a6e3a1', 8: '#89b4fa', 9: '#89b4fa', 10: '#cba6f7'
  }

  const moodLabels: { [key: number]: string } = {
    1: '很低落', 2: '难过', 3: '有些低落',
    4: '一般', 5: '平静', 6: '不错',
    7: '愉悦', 8: '开心', 9: '很兴奋', 10: '太棒了'
  }

  // Load tags
  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()
      setTags(data)
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  // Save diary
  const handleSave = async () => {
    if (!content.trim()) return
    
    setIsSaving(true)
    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: getDateString(),
          title: title || `日记 - ${formatDate(new Date(), 'short')}`,
          content,
          mood_score: moodScore,
          tagIds: selectedTags
        })
      })
      
      if (res.ok) {
        setShowSuccess(true)
        setTitle('')
        setContent('')
        setMoodScore(5)
        setSelectedTags([])
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Start guide mode
  const startGuide = async () => {
    setShowGuide(true)
    setIsGuiding(true)
    
    // Initial AI greeting
    setGuideMessages([
      { type: 'ai', content: '嗨！很高兴和你聊天 😊\n\n我们来聊聊今天吧，想先分享什么？' }
    ])
    
    setIsGuiding(false)
  }

  // Send guide message
  const sendGuideMessage = async () => {
    if (!userInput.trim()) return
    
    const newMessages = [...guideMessages, { type: 'user' as const, content: userInput }]
    setGuideMessages(newMessages)
    const input = userInput
    setUserInput('')
    
    setIsGuiding(true)
    try {
      const res = await fetch('/api/ai/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: newMessages.slice(0, -1),
          firstMessage: newMessages.length === 1 ? input : undefined
        })
      })
      const data = await res.json()
      
      setGuideMessages(prev => [...prev, { type: 'ai', content: data.question || '还有什么想分享的吗？' }])
    } catch (error) {
      setGuideMessages(prev => [...prev, { type: 'ai', content: '还有什么想记录的吗？' }])
    } finally {
      setIsGuiding(false)
    }
  }

  // 导入日记文件
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      let successCount = 0
      let entries: any[] = []
      
      if (Array.isArray(data)) {
        entries = data
      } else if (data.entries && Array.isArray(data.entries)) {
        entries = data.entries
      } else {
        alert('文件格式不正确')
        setIsImporting(false)
        return
      }
      
      for (const entry of entries) {
        const res = await fetch('/api/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: entry.date || getDateString(),
            title: entry.title || `导入日记`,
            content: entry.content || entry.text || '',
            mood_score: entry.mood_score || entry.mood || 5,
            tagIds: entry.tagIds || []
          })
        })
        if (res.ok) successCount++
      }
      
      alert(`成功导入 ${successCount} 篇日记`)
      window.location.reload()
    } catch (error) {
      alert('导入失败：' + (error as Error).message)
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const emotionTags = tags.filter(t => t.type === 'emotion')
  const meaningTags = tags.filter(t => t.type === 'meaning')

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green text-white px-6 py-3 rounded-xl shadow-lg animate-slide-down">
            ✅ 日记保存成功！
          </div>
        )}

        {/* 功能选择说明 */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(FEATURES).map(([key, feature]) => {
            const Icon = feature.icon
            return (
              <Card key={key} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 text-center">
                  <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-medium">{feature.title.replace(/^[^\s]+\s/, '')}</h3>
                  <p className="text-xs text-subtext0 mt-1">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Writing Mode Tabs */}
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="write">✏️ 自由写作</TabsTrigger>
            <TabsTrigger value="guide">💬 AI引导</TabsTrigger>
            <TabsTrigger value="import">📂 导入</TabsTrigger>
          </TabsList>

          {/* Free Write Mode - 自由写作：直接记录 */}
          <TabsContent value="write" className="space-y-6 animate-in">
            <Card>
              <CardContent className="p-6 space-y-4">
                {/* Title */}
                <Input
                  placeholder="日记标题（选填）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />

                {/* Content */}
                <Textarea
                  placeholder="记录今天发生的事情..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] text-base"
                />

                {/* Word Count */}
                <div className="text-sm text-subtext0">
                  {countWords(content)} 字
                </div>

                {/* Mood Slider */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">今日心情</label>
                  <Slider
                    value={moodScore}
                    onChange={setMoodScore}
                    min={1}
                    max={10}
                    labels={moodLabels}
                    colors={moodColors}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">情感标签</label>
                  <div className="flex flex-wrap gap-2">
                    {emotionTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface0 text-subtext1 hover:bg-surface1'
                        }`}
                        style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color || undefined } : {}}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">意义标签</label>
                  <div className="flex flex-wrap gap-2">
                    {meaningTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-surface0 text-subtext1 hover:bg-surface1'
                        }`}
                        style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color || undefined } : {}}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button onClick={handleSave} disabled={!content.trim() || isSaving} className="w-full">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                    保存日记
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guide Mode - AI引导：通过对话深入探索 */}
          <TabsContent value="guide" className="space-y-4">
            {!showGuide ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI引导写作</h3>
                  <p className="text-subtext0 mb-2">
                    通过对话深入探索今天的经历
                  </p>
                  <p className="text-sm text-subtext0 mb-6">
                    AI会提出一些问题，帮助你更好地回顾和记录
                  </p>
                  <Button onClick={startGuide} size="lg">
                    开始对话 <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[500px] flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {guideMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface0 text-text'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isGuiding && (
                    <div className="flex justify-start">
                      <div className="bg-surface0 rounded-2xl px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-surface0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入你的回答..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendGuideMessage()}
                      disabled={isGuiding}
                    />
                    <Button onClick={sendGuideMessage} disabled={isGuiding || !userInput.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Import Mode - 导入：批量导入JSON */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="border-2 border-dashed border-surface0 rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-subtext0" />
                  <h3 className="text-lg font-medium mb-2">导入日记文件</h3>
                  <p className="text-subtext0 mb-4">选择之前导出的JSON文件进行批量导入</p>
                  <input
                    type="file"
                    id="import-file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileImport}
                    disabled={isImporting}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('import-file')?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        选择文件
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-subtext0 mt-4">
                    支持从「设置」→「数据备份」导出的JSON文件
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
