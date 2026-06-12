import { DAILY_LIMIT, getClientIp, getClientTimeZone, getCount } from '../../lib/rateLimit'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ip = getClientIp(req)
  const timeZone = getClientTimeZone(req)
  try {
    const used = await getCount(ip, timeZone, process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
    return res.status(200).json({ remaining: Math.max(0, DAILY_LIMIT - used) })
  } catch {
    return res.status(200).json({ remaining: DAILY_LIMIT })
  }
}
