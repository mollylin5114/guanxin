const DAILY_LIMIT = 5

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return (value?.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim()
}

async function getCount(ip, redisUrl, redisToken) {
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`
  const res = await fetch(`${redisUrl}/get/${key}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  })
  const data = await res.json()
  return parseInt(data.result || '0', 10)
}

async function decrementCount(ip, redisUrl, redisToken) {
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`
  // Only decrement if > 0
  const current = await getCount(ip, redisUrl, redisToken)
  if (current <= 0) return 0
  const res = await fetch(`${redisUrl}/decr/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}` },
  })
  const data = await res.json()
  return Math.max(0, parseInt(data.result || '0', 10))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const ip = getClientIp(req)

  try {
    const newCount = await decrementCount(ip, redisUrl, redisToken)
    const remaining = Math.max(0, DAILY_LIMIT - newCount)
    return res.status(200).json({ remaining })
  } catch {
    return res.status(500).json({ error: '操作失败' })
  }
}
