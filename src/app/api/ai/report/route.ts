import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { diaries, config } = await request.json()
    
    if (!diaries || diaries.length === 0) {
      return NextResponse.json({ error: '没有日记数据' }, { status: 400 })
    }

    const { provider, apiKey, baseUrl, model } = config

    const aiBaseUrl = provider === 'qwen' 
      ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      : provider === 'deepseek'
      ? 'https://api.deepseek.com/v1'
      : baseUrl

    const aiModel = provider === 'qwen' ? (model || 'qwen-turbo')
      : provider === 'deepseek' ? (model || 'deepseek-chat')
      : (model || 'custom')

    // 构建日记内容
    const diaryContent = diaries.map((d: any) => 
      `[${d.date}] ${d.content}`
    ).join('\n---\n')

    const prompt = `请根据用户最近的日记内容，生成一份深入的个人分析报告。

日记内容：
${diaryContent}

请分析并返回JSON格式的报告（只返回JSON）：
{
  "title": "报告标题（如：你的内心世界深度解析）",
  "content": "详细的分析内容，包括：\n1. 你的性格特点\n2. 情绪模式分析\n3. 潜在优势和成长空间\n4. 改善建议\n（用中文写，200字以上）"
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
        max_tokens: 1500,
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

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return NextResponse.json({
        ...result,
        generatedAt: new Date().toISOString()
      })
    }

    throw new Error('无法解析 AI 返回')
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: '生成报告失败' }, { status: 500 })
  }
}
