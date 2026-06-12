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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim()
  try {
    const used = await getCount(ip)
    return res.status(200).json({ remaining: Math.max(0, DAILY_LIMIT - used) })
  } catch {
    return res.status(200).json({ remaining: DAILY_LIMIT })
  }
}
