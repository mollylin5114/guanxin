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

export default async function handler(req) {
  if (req.method !== 'GET') return new Response(null, { status: 405 })
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim()
  try {
    const used = await getCount(ip, process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
    return new Response(JSON.stringify({ remaining: Math.max(0, DAILY_LIMIT - used) }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch {
    return new Response(JSON.stringify({ remaining: DAILY_LIMIT }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }
}
