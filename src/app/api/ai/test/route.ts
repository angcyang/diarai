import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, baseUrl, model } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入 API Key' 
      }, { status: 400 })
    }
    
    // 构建测试请求
    const testUrl = provider === 'qwen' 
      ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
      : provider === 'deepseek'
      ? 'https://api.deepseek.com/v1/chat/completions'
      : `${baseUrl}/chat/completions`
    
    const testModel = provider === 'qwen' ? 'qwen-turbo' 
      : provider === 'deepseek' ? 'deepseek-chat' 
      : model
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      }),
    })
    
    if (response.ok) {
      return NextResponse.json({ success: true, message: '连接成功' })
    } else {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json({ 
        success: false, 
        error: error.error?.message || `请求失败 (${response.status})` 
      }, { status: 200 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: '网络错误，请检查网络连接和 API 地址' 
    }, { status: 200 })
  }
}
