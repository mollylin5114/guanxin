const DAILY_LIMIT = 5

async function getCount(ip) {
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  })
  const data = await res.json()
  return parseInt(data.result || '0', 10)
}

async function decrementCount(ip) {
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`
  // Only decrement if > 0
  const current = await getCount(ip)
  if (current <= 0) return 0
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/decr/${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  })
  const data = await res.json()
  return Math.max(0, parseInt(data.result || '0', 10))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim()
  try {
    const newCount = await decrementCount(ip)
    const remaining = Math.max(0, DAILY_LIMIT - newCount)
    return res.status(200).json({ remaining })
  } catch {
    return res.status(500).json({ error: '操作失败' })
  }
}
