export const runtime = 'edge'

const DAILY_LIMIT = 5

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

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(null, { status: 405 })

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim()

  try {
    const newCount = await decrementCount(ip, redisUrl, redisToken)
    const remaining = Math.max(0, DAILY_LIMIT - newCount)
    return new Response(JSON.stringify({ remaining }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: '操作失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
