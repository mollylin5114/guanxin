export const DAILY_LIMIT = 5

const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return (value?.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim()
}

export function getClientTimeZone(req) {
  const header = req.headers['x-guanxin-timezone']
  const value = Array.isArray(header) ? header[0] : header
  const timeZone = req.body?.timezone || req.query?.tz || value || DEFAULT_TIME_ZONE

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

function getLocalDateKey(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function secondsUntilNextLocalDay(timeZone) {
  const now = new Date()
  const today = getLocalDateKey(timeZone, now)
  let low = now.getTime()
  let high = low + 60 * 60 * 1000

  while (getLocalDateKey(timeZone, new Date(high)) === today) {
    high += 60 * 60 * 1000
  }

  for (let i = 0; i < 24; i += 1) {
    const mid = Math.floor((low + high) / 2)
    if (getLocalDateKey(timeZone, new Date(mid)) === today) {
      low = mid
    } else {
      high = mid
    }
  }

  return Math.max(60, Math.ceil((high - now.getTime()) / 1000) + 60)
}

export function getRateLimitKey(ip, timeZone) {
  return `rl:${ip}:${timeZone}:${getLocalDateKey(timeZone)}`
}

export async function getCount(ip, timeZone, redisUrl, redisToken) {
  const key = getRateLimitKey(ip, timeZone)
  const res = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  })
  const data = await res.json()
  return parseInt(data.result || '0', 10)
}

export async function incrementCount(ip, timeZone, redisUrl, redisToken) {
  const key = getRateLimitKey(ip, timeZone)
  const ttl = secondsUntilNextLocalDay(timeZone)
  const res = await fetch(`${redisUrl}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, ttl]]),
  })
  const data = await res.json()
  return data[0].result
}

export async function decrementCount(ip, timeZone, redisUrl, redisToken) {
  const key = getRateLimitKey(ip, timeZone)
  const current = await getCount(ip, timeZone, redisUrl, redisToken)
  if (current <= 0) return 0
  const res = await fetch(`${redisUrl}/decr/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}` },
  })
  const data = await res.json()
  return Math.max(0, parseInt(data.result || '0', 10))
}
