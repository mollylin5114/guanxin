const DAILY_LIMIT = 5

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return (value?.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim()
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.DEEPSEEK_API_KEY
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!apiKey || !redisUrl || !redisToken) return res.status(500).json({ error: '服务配置错误' })

  const ip = getClientIp(req)

  const used = await getCount(ip, redisUrl, redisToken)
  if (used >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `你今天已使用 ${DAILY_LIMIT} 次，明天再来吧 🌙`,
      remaining: 0,
    })
  }

  const { text } = req.body || {}
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
  "suggestion": "一句温暖有力的话，帮助用户看见自己、接纳自己",
  "perspectives": [
    {
      "name": "庄子",
      "avatar": "zhuangzi",
      "content": "你关注的是对方的矛盾，还是自己对矛盾的不舒服？"
    }
  ]
}

type说明：
- projection: 投射（把自己内心的想法/感受归因到他人或外部）
- real: 真实感受（确实在表达自己的感受或经历）
- emotion: 情绪（明显的情绪状态）
- need: 内在需要（话语背后未被满足的需要）

items至少3条，最多6条。语言简体中文，温暖、不评判。`

  const perspectivePrompt = `

perspectives说明：
- 必须返回6个固定人物，顺序为：庄子、苏轼、王阳明、蒋勋、克里希那穆提、王菲。
- avatar固定为：zhuangzi、sushi、wangyangming、jiangxun、krishnamurti、wangfei。
- 每个人模拟面对用户问题时最可能产生的第一反应。
- 每条content控制在30到60个中文字符，最多3行阅读长度。
- 不要讲道理，不要人生鸡汤，不要标准建议，不要长篇解释。
- 允许提问、观察、反转、留白。
- 风格像翻开一本书时看到的一段批注。
- 关键词参考：
  王菲：允许、边界、自处、顺其自然。
  庄子：逍遥、齐物、无待、跳出执念。
  苏轼：旷达、流动、苦中见明、与自己和解。
  克里希那穆提：观察、觉察、停止追逐答案。
  王阳明：知行合一、向内求、此心光明。
  蒋勋：审美、生命体验、温柔理解。
`

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1700,
        messages: [
          { role: 'system', content: systemPrompt + perspectivePrompt },
          { role: 'user', content: text },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || '请求失败' })
    }

    const raw = data?.choices?.[0]?.message?.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    const newCount = await incrementCount(ip, redisUrl, redisToken)
    const remaining = DAILY_LIMIT - newCount

    return res.status(200).json({ ...parsed, remaining })
  } catch (e) {
    return res.status(500).json({ error: '分析时出现错误，请稍后重试' })
  }
}
