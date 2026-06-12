// In-memory rate limiting (resets on server restart; fine for Vercel serverless)
const rateLimitMap = new Map()

function getRateLimit(ip) {
  const today = new Date().toISOString().slice(0, 10)
  const key = `${ip}:${today}`
  return rateLimitMap.get(key) || 0
}

function incrementRateLimit(ip) {
  const today = new Date().toISOString().slice(0, 10)
  const key = `${ip}:${today}`
  const count = (rateLimitMap.get(key) || 0) + 1
  rateLimitMap.set(key, count)
  // Clean old keys
  for (const [k] of rateLimitMap) {
    if (!k.endsWith(today)) rateLimitMap.delete(k)
  }
  return count
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return res.status(500).json({ error: '服务配置错误，请联系管理员' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const DAILY_LIMIT = 5

  const used = getRateLimit(ip)
  if (used >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `你今天已使用 ${DAILY_LIMIT} 次，明天再来吧 🌙`,
      remaining: 0,
    })
  }

  const { text } = req.body
  if (!text) return res.status(400).json({ error: '请输入内容' })

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
        'Authorization': `Bearer ${apiKey}`,
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
      const msg = data?.error?.message || '请求失败'
      return res.status(response.status).json({ error: msg })
    }

    const raw = data?.choices?.[0]?.message?.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const newCount = incrementRateLimit(ip)
    const remaining = DAILY_LIMIT - newCount

    return res.status(200).json({ ...parsed, remaining })
  } catch (e) {
    return res.status(500).json({ error: '分析时出现错误，请稍后重试' })
  }
}
