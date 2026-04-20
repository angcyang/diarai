import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { month, diaries, config } = await request.json()
    
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

    // 计算基本统计
    const totalWords = diaries.reduce((sum: number, d: any) => sum + (d.content?.length || 0), 0)
    const avgMood = diaries.reduce((sum: number, d: any) => sum + (d.mood_score || 5), 0) / diaries.length

    // 构建日记内容
    const diaryContent = diaries.map((d: any) => 
      `[${d.date}] 心情${d.mood_score}/10: ${d.content}`
    ).join('\n---\n')

    const prompt = `请为用户生成 ${month} 月的月度总结。

当月日记统计：
- 日记数量：${diaries.length} 篇
- 总字数：${totalWords} 字
- 平均心情：${avgMood.toFixed(1)}/10

日记内容：
${diaryContent}

请分析并返回JSON格式的月度总结（只返回JSON）：
{
  "month": "${month}",
  "totalDiaries": ${diaries.length},
  "totalWords": ${totalWords},
  "avgMood": ${avgMood.toFixed(1)},
  "topEmotions": ["主要情绪1", "次要情绪2"],
  "summary": "月度总结的详细描述，包括：这个月的主要情绪变化、重要事件、生活主题等（100字以上）",
  "highlights": ["亮点事件1", "亮点事件2", "亮点事件3"]
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
        max_tokens: 1000,
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
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    throw new Error('无法解析 AI 返回')
  } catch (error) {
    console.error('Monthly summary error:', error)
    return NextResponse.json({ error: '生成月度总结失败' }, { status: 500 })
  }
}
