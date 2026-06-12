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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ip = getClientIp(req)
  try {
    const used = await getCount(ip, process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
    return res.status(200).json({ remaining: Math.max(0, DAILY_LIMIT - used) })
  } catch {
    return res.status(200).json({ remaining: DAILY_LIMIT })
  }
}
