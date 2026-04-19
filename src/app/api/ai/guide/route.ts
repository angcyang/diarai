import { NextRequest, NextResponse } from 'next/server'
import { generateGuideQuestion } from '@/lib/ai'
import { AIConfig, GuideMessage } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationHistory, firstMessage } = body

    // Get AI config from env
    const aiConfig: AIConfig = {
      provider: (process.env.AI_PROVIDER as AIConfig['provider']) || 'qwen',
      apiKey: process.env.QWEN_API_KEY || process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.QWEN_BASE_URL,
      model: process.env.AI_MODEL,
    }

    // First message - start conversation
    if (firstMessage) {
      const initialQuestion = `请根据用户说的"${firstMessage}"，写一段温暖的开场白（30字以内），然后提出第一个引导问题（20字以内）。格式：开场白|问题`
      
      try {
        const result = await generateGuideQuestion([
          { type: 'user', content: firstMessage }
        ], aiConfig)

        const [intro, question] = result.split('|')
        return NextResponse.json({
          intro: intro?.trim() || '很高兴和你聊天~',
          question: question?.trim() || '今天发生了什么让你印象深刻的事？'
        })
      } catch {
        return NextResponse.json({
          intro: '今天想聊聊什么呢？',
          question: '最近有什么让你印象深刻的事吗？'
        })
      }
    }

    // Continue conversation
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const question = await generateGuideQuestion(conversationHistory, aiConfig)
      return NextResponse.json({ question })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('AI guide error:', error)
    // Fallback response
    return NextResponse.json({
      question: '今天还有什么想记录的吗？'
    })
  }
}
