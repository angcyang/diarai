import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { diaries, config } = await request.json()
    
    if (!diaries || diaries.length === 0) {
      return NextResponse.json({ error: '没有日记数据' }, { status: 400 })
    }

    const { provider, apiKey, baseUrl, model } = config

    // 构建 AI 请求 URL
    const aiBaseUrl = provider === 'qwen' 
      ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      : provider === 'deepseek'
      ? 'https://api.deepseek.com/v1'
      : baseUrl

    const aiModel = provider === 'qwen' ? (model || 'qwen-turbo')
      : provider === 'deepseek' ? (model || 'deepseek-chat')
      : (model || 'custom')

    // 构建日记内容摘要
    const diaryContent = diaries.map((d: any) => 
      `[${d.date}] 心情${d.mood_score}/10: ${d.content.slice(0, 300)}`
    ).join('\n---\n')

    const prompt = `请根据以下日记内容，分析用户的性格特点和写作习惯：

${diaryContent}

请返回一个JSON格式的分析结果（只返回JSON，不要其他内容）：
{
  "moodBase": "用户的主要情绪基调描述（20字以内）",
  "focusAreas": ["关注领域1（带emoji，如🌟 积极）", "关注领域2", "关注领域3"],
  "growthTrack": "用户的成长轨迹描述（30字以内）",
  "writingHabit": "用户的写作习惯描述（20字以内）"
}`

    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json({ 
        error: error.error?.message || 'AI 请求失败' 
      }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return NextResponse.json(result)
    }

    throw new Error('无法解析 AI 返回')
  } catch (error) {
    console.error('Profile generation error:', error)
    return NextResponse.json({ error: '生成失败' }, { status: 500 })
  }
}
