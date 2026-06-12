export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, apiKey } = req.body
  if (!text || !apiKey) return res.status(400).json({ error: '缺少必要参数' })

  const prompt = `你是一位温柔而敏锐的心理分析师，擅长帮助人识别话语中的投射、真实感受、情绪和内在需要。
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

items至少3条，最多6条。语言简体中文，温暖、不评判。

用户输入：${text}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const msg = data?.error?.message || '请求失败'
      if (response.status === 400 && msg.includes('API_KEY')) {
        return res.status(401).json({ error: 'API Key 无效，请检查后重试' })
      }
      return res.status(response.status).json({ error: msg })
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.status(200).json(parsed)
  } catch (e) {
    return res.status(500).json({ error: '分析时出现错误，请稍后重试' })
  }
}
