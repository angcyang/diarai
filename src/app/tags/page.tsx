'use client'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { useState, useEffect } from 'react'
import { EMOTION_LABELS, MEANING_LABELS } from '@/types'
import { Plus, Edit, Trash2, Search, Merge } from 'lucide-react'

interface Tag {
  id: string
  name: string
  type: string
  color: string | null
  count: number
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagType, setNewTagType] = useState<'emotion' | 'meaning'>('meaning')
  const [newTagColor, setNewTagColor] = useState('#89b4fa')

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
    } finally {
      setLoading(false)
    }
  }

  const addTag = async () => {
    if (!newTagName.trim()) return

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName,
          type: newTagType,
          color: newTagColor
        })
      })

      if (res.ok) {
        const tag = await res.json()
        setTags(prev => [...prev, { ...tag, count: 0 }])
        setShowAddDialog(false)
        setNewTagName('')
        setNewTagType('meaning')
        setNewTagColor('#89b4fa')
      } else {
        const error = await res.json()
        alert(error.error || '创建失败')
      }
    } catch (error) {
      console.error('Add tag error:', error)
    }
  }

  const editTag = async () => {
    if (!editingTag || !newTagName.trim()) return

    try {
      // Delete old tag and create new one
      await fetch(`/api/tags?id=${editingTag.id}`, { method: 'DELETE' })
      
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName,
          type: newTagType,
          color: newTagColor
        })
      })

      if (res.ok) {
        await fetchTags()
        setShowEditDialog(false)
        setEditingTag(null)
        setNewTagName('')
      }
    } catch (error) {
      console.error('Edit tag error:', error)
    }
  }

  const deleteTag = async (id: string) => {
    if (!confirm('确定要删除这个标签吗？')) return

    try {
      await fetch(`/api/tags?id=${id}`, { method: 'DELETE' })
      setTags(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Delete tag error:', error)
    }
  }

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag)
    setNewTagName(tag.name)
    setNewTagType(tag.type as 'emotion' | 'meaning')
    setNewTagColor(tag.color || '#89b4fa')
    setShowEditDialog(true)
  }

  const emotionTags = tags.filter(t => t.type === 'emotion')
  const meaningTags = tags.filter(t => t.type === 'meaning')
  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Search and Add */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext0" />
            <Input
              placeholder="搜索标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            添加标签
          </Button>
        </div>

        {/* Emotion Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">😊</span>
              情感标签
              <Badge variant="secondary">{emotionTags.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {emotionTags.map(tag => (
                <div
                  key={tag.id}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                  style={{ backgroundColor: `${tag.color}20` }}
                >
                  <span className="font-medium" style={{ color: tag.color }}>
                    {tag.name}
                  </span>
                  <span className="text-xs text-subtext0">({tag.count})</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={() => openEditDialog(tag)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="p-1 hover:bg-white/10 rounded text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {emotionTags.length === 0 && (
                <p className="text-subtext0">暂无情感标签</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meaning Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📌</span>
              意义标签
              <Badge variant="secondary">{meaningTags.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {meaningTags.map(tag => (
                <div
                  key={tag.id}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                  style={{ backgroundColor: `${tag.color}20` }}
                >
                  <span className="font-medium" style={{ color: tag.color }}>
                    {tag.name}
                  </span>
                  <span className="text-xs text-subtext0">({tag.count})</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={() => openEditDialog(tag)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="p-1 hover:bg-white/10 rounded text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {meaningTags.length === 0 && (
                <p className="text-subtext0">暂无意义标签</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Tag Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新标签</DialogTitle>
              <DialogDescription>创建一个新的标签用于标记你的日记</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">标签名称</label>
                <Input
                  placeholder="例如：🌟 成就"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">标签类型</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tagType"
                      value="emotion"
                      checked={newTagType === 'emotion'}
                      onChange={() => setNewTagType('emotion')}
                    />
                    <span>情感标签</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tagType"
                      value="meaning"
                      checked={newTagType === 'meaning'}
                      onChange={() => setNewTagType('meaning')}
                    />
                    <span>意义标签</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">标签颜色</label>
                <div className="flex gap-2">
                  {['#f9e2af', '#89b4fa', '#a6e3a1', '#cba6f7', '#fab387', '#f38ba8'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full ${newTagColor === color ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button onClick={addTag}>添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Tag Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑标签</DialogTitle>
              <DialogDescription>修改标签的名称、类型或颜色</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">标签名称</label>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">标签类型</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editTagType"
                      value="emotion"
                      checked={newTagType === 'emotion'}
                      onChange={() => setNewTagType('emotion')}
                    />
                    <span>情感标签</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editTagType"
                      value="meaning"
                      checked={newTagType === 'meaning'}
                      onChange={() => setNewTagType('meaning')}
                    />
                    <span>意义标签</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">标签颜色</label>
                <div className="flex gap-2">
                  {['#f9e2af', '#89b4fa', '#a6e3a1', '#cba6f7', '#fab387', '#f38ba8'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full ${newTagColor === color ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={editTag}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
