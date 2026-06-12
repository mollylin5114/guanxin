export const runtime = 'edge'

const DAILY_LIMIT = 5

async function getCount(ip, url, token) {
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return parseInt(data.result || '0', 10)
}

async function incrementCount(ip, url, token) {
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, 86400]]),
  })
  const data = await res.json()
  return data[0].result
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(null, { status: 405 })

  const apiKey = process.env.DEEPSEEK_API_KEY
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!apiKey) return new Response(JSON.stringify({ error: '服务配置错误' }), { status: 500 })

  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim()

  const used = await getCount(ip, redisUrl, redisToken)
  if (used >= DAILY_LIMIT) {
    return new Response(JSON.stringify({
      error: `你今天已使用 ${DAILY_LIMIT} 次，明天再来吧 🌙`,
      remaining: 0,
    }), { status: 429, headers: { 'Content-Type': 'application/json' } })
  }

  const body = await req.json()
  const { text } = body
  if (!text) return new Response(JSON.stringify({ error: '请输入内容' }), { status: 400 })

  const systemPrompt = `你是一位温柔而敏锐的心理分析师，擅长帮助人识别话语中的投射、真实感受、情绪和内在需要。
用户会输入一段文字，你需要分析并以JSON格式返回，不要返回任何其他内容，不要有markdown代码块。

JSON格式如下：
{
  "summary": "2-3句话整体概括这段话反映的内心状态，语气温和",
  "items": [
    {
      "type": "projection|real|emotion|need",
      "quote": "从原文中摘取的片段或归纳的表达",
      "explain": "对这一条的分析解释，2-3句，温柔直接"
    }
  ],
  "suggestion": "一句温暖有力的话，帮助用户看见自己、接纳自己"
}

type说明：
- projection: 投射（把自己内心的想法/感受归因到他人或外部）
- real: 真实感受（确实在表达自己的感受或经历）
- emotion: 情绪（明显的情绪状态）
- need: 内在需要（话语背后未被满足的需要）

items至少3条，最多6条。语言简体中文，温暖、不评判。`

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || '请求失败' }), {
        status: response.status, headers: { 'Content-Type': 'application/json' }
      })
    }

    const raw = data?.choices?.[0]?.message?.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    const newCount = await incrementCount(ip, redisUrl, redisToken)
    const remaining = DAILY_LIMIT - newCount

    return new Response(JSON.stringify({ ...parsed, remaining }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: '分析时出现错误，请稍后重试' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
