// Database Types
export interface Entry {
  id: string
  date: string // YYYY-MM-DD
  title: string | null
  content: string // Markdown format
  mood_score: number // 1-10
  created_at: string // ISO 8601
  updated_at: string // ISO 8601
}

export interface Tag {
  id: string
  name: string
  type: 'emotion' | 'meaning'
  color: string | null // Hex color
}

export interface EntryTag {
  entry_id: string
  tag_id: string
}

export interface AIAnalysis {
  id: string
  entry_id: string
  model: string
  summary: string // 50 chars max
  emotion: string
  keywords: string[] // JSON array
  tags: string[] // JSON array
  advice: string
  created_at: string
}

// App Types
export type EmotionType = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry' | 'grateful' | 'confused'

export interface EmotionInfo {
  label: string
  emoji: string
  color: string
  description: string
}

export const EMOTION_LABELS: Record<EmotionType, EmotionInfo> = {
  happy: { label: '开心', emoji: '😊', color: '#f9e2af', description: '愉悦、喜悦' },
  calm: { label: '平静', emoji: '😌', color: '#89b4fa', description: '淡然、安宁' },
  anxious: { label: '焦虑', emoji: '😟', color: '#fab387', description: '担心、紧张' },
  sad: { label: '悲伤', emoji: '😢', color: '#6c7086', description: '低落、伤心' },
  angry: { label: '愤怒', emoji: '😤', color: '#f38ba8', description: '不满、生气' },
  grateful: { label: '感恩', emoji: '🙏', color: '#a6e3a1', description: '感激、珍惜' },
  confused: { label: '迷芒', emoji: '😕', color: '#cba6f7', description: '困惑、不确定' },
}

export type MeaningType = 'positive' | 'daily' | 'social' | 'reflect' | 'challenge'

export interface MeaningInfo {
  label: string
  emoji: string
  color: string
  description: string
}

export const MEANING_LABELS: Record<MeaningType, MeaningInfo> = {
  positive: { label: '积极', emoji: '🌟', color: '#a6e3a1', description: '成就、正向事件、进步' },
  daily: { label: '日常', emoji: '📅', color: '#bac2de', description: '常规生活、习惯记录' },
  social: { label: '社交', emoji: '👥', color: '#89b4fa', description: '朋友、家人、人际互动' },
  reflect: { label: '反思', emoji: '🪞', color: '#cba6f7', description: '自我审视、感悟、内省' },
  challenge: { label: '挑战', emoji: '⚡', color: '#f9e2af', description: '困难、压力、成长节点' },
}

// AI Types
export type ModelProvider = 'qwen' | 'deepseek' | 'custom'

export interface AIConfig {
  provider: ModelProvider
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface AIAnalysisResult {
  summary: string
  emotion: EmotionType
  keywords: string[]
  suggestedTags: string[]
  advice: string
}

export interface GuideMessage {
  type: 'ai' | 'user'
  content: string
}

// Stats Types
export interface MonthlyStats {
  month: string
  count: number
  words: number
  avgMood: number
}

export interface EmotionDistribution {
  emotion: EmotionType
  count: number
  percentage: number
}

export interface TagDistribution {
  tag: string
  count: number
  color: string
}

// Profile Types
export interface UserProfile {
  moodBase: string
  focusAreas: string[]
  growthTrack: string
  writingHabit: string
  radarData: { name: MeaningType; value: number }[]
}
