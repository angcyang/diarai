import { AIConfig, AIAnalysisResult, GuideMessage } from '@/types'

// AI Provider implementations
async function callQwen(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch(`${config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`Qwen API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callDeepSeek(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callCustom(prompt: string, config: AIConfig): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'custom',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`Custom API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Main AI call function
export async function callAI(prompt: string, config: AIConfig): Promise<string> {
  switch (config.provider) {
    case 'qwen':
      return callQwen(prompt, config)
    case 'deepseek':
      return callDeepSeek(prompt, config)
    case 'custom':
      return callCustom(prompt, config)
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }
}

// Stream AI response (for SSE)
export async function* streamAI(prompt: string, config: AIConfig): AsyncGenerator<string> {
  const baseUrl = config.provider === 'qwen'
    ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    : config.provider === 'deepseek'
    ? 'https://api.deepseek.com'
    : config.baseUrl || ''

  const model = config.provider === 'qwen'
    ? (config.model || 'qwen-turbo')
    : config.provider === 'deepseek'
    ? (config.model || 'deepseek-chat')
    : (config.model || 'custom')

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {}
      }
    }
  }
}

// Analyze diary content
export async function analyzeDiary(content: string, config: AIConfig): Promise<AIAnalysisResult> {
  const prompt = `请分析以下日记内容，并返回一个JSON格式的分析结果：

日记内容：
${content}

请分析并返回以下格式的JSON（不要包含其他内容）：
{
  "summary": "50字以内的日记摘要",
  "emotion": "开心|平静|焦虑|悲伤|愤怒|感恩|迷芒",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "suggestedTags": ["建议标签1", "建议标签2"],
  "advice": "一段温和的建议或回应，30字以内"
}

只返回JSON，不要其他内容：`

  try {
    const result = await callAI(prompt, config)
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('AI analysis error:', error)
    // Return fallback analysis
    return fallbackAnalysis(content)
  }
}

// Fallback analysis when AI is not available
function fallbackAnalysis(content: string): AIAnalysisResult {
  const emotionKeywords: Record<string, string[]> = {
    happy: ['开心', '快乐', '幸福', '愉快', '高兴', '棒', '好', '成功', '满足', '喜悦'],
    calm: ['平静', '安静', '放松', '舒适', '安心', '宁静'],
    anxious: ['焦虑', '担心', '紧张', '害怕', '压力', '不安'],
    sad: ['难过', '伤心', '哭', '痛', '失望', '悲伤', '失落'],
    angry: ['生气', '愤怒', '恼火', '讨厌', '烦', '不满'],
    grateful: ['感谢', '感激', '谢谢', '珍惜', '感恩', '幸福'],
    confused: ['困惑', '迷茫', '迷芒', '不确定', '犹豫'],
  }

  const emotionCounts: Record<string, number> = {}
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    emotionCounts[emotion] = keywords.reduce((count, kw) => 
      count + (content.includes(kw) ? 1 : 0), 0
    )
  }

  const mainEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm'

  // Extract keywords (simple Chinese word extraction)
  const commonWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']
  const words = content.match(/[\u4e00-\u9fa5]{2,}/g) || []
  const wordCounts: Record<string, number> = {}
  
  words.forEach(word => {
    if (!commonWords.includes(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  })

  const keywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w)

  return {
    summary: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
    emotion: mainEmotion as AIAnalysisResult['emotion'],
    keywords,
    suggestedTags: [],
    advice: '继续记录生活，关注自己的情绪变化',
  }
}

// Generate guide questions
export async function generateGuideQuestion(
  conversationHistory: GuideMessage[],
  config: AIConfig
): Promise<string> {
  const historyText = conversationHistory
    .map(m => `${m.type === 'ai' ? 'AI' : '用户'}: ${m.content}`)
    .join('\n')

  const prompt = `你是一个温暖的日记写作引导师。用户正在写日记，你需要进行追问式引导。

对话历史：
${historyText}

请根据对话历史，提出下一个引导问题。问题要温暖、有深度、能帮助用户深入思考。
只返回一个简短的问题（20字以内），不要其他内容：`

  try {
    return await callAI(prompt, config)
  } catch {
    // Fallback questions
    const questions = [
      '那件事让你有什么感受？',
      '能详细说说吗？',
      '这件事对你意味着什么？',
      '你从中学到了什么？',
      '今天还有什么想记录的吗？',
    ]
    return questions[Math.floor(Math.random() * questions.length)]
  }
}

// Generate user profile
export async function generateProfile(
  diaries: { content: string; mood_score: number; date: string }[],
  config: AIConfig
): Promise<{
  moodBase: string
  focusAreas: string[]
  growthTrack: string
  writingHabit: string
}> {
  const recentDiaries = diaries.slice(0, 10)
  const content = recentDiaries.map(d => `[${d.date}] ${d.content}`).join('\n---\n')

  const prompt = `请根据以下日记内容，分析用户的性格特点和写作习惯：

${content}

请返回JSON格式的分析结果：
{
  "moodBase": "用户的主要情绪基调描述（20字以内）",
  "focusAreas": ["关注领域1", "关注领域2", "关注领域3"],
  "growthTrack": "用户的成长轨迹描述（30字以内）",
  "writingHabit": "用户的写作习惯描述（20字以内）"
}

只返回JSON，不要其他内容：`

  try {
    const result = await callAI(prompt, config)
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Failed to parse AI response')
  } catch {
    // Fallback profile
    const moods = recentDiaries.map(d => d.mood_score)
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 5

    return {
      moodBase: avgMood > 6 ? '积极乐观，情绪稳定' : avgMood > 4 ? '情绪平稳，偶尔低落' : '近期情绪波动较大',
      focusAreas: ['工作', '生活', '人际关系'],
      growthTrack: '持续记录中，逐步发现生活美好',
      writingHabit: '习惯在晚间记录，文字朴实真挚',
    }
  }
}
