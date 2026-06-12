import { DAILY_LIMIT, decrementCount, getClientIp, getClientTimeZone } from '../../lib/rateLimit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const ip = getClientIp(req)
  const timeZone = getClientTimeZone(req)

  try {
    const newCount = await decrementCount(ip, timeZone, redisUrl, redisToken)
    const remaining = Math.max(0, DAILY_LIMIT - newCount)
    return res.status(200).json({ remaining })
  } catch {
    return res.status(500).json({ error: '操作失败' })
  }
}
