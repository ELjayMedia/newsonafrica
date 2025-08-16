import { Redis } from '@upstash/redis'

type Entry<T> = { value: T; expires: number }
const memory = new Map<string, Entry<unknown>>()

let redis: Redis | null = null
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis) {
    return ((await redis.get<T>(key)) as T) || null
  }
  const entry = memory.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    memory.delete(key)
    return null
  }
  return entry.value as T
}

export async function cacheSet<T>(key: string, value: T, ttl: number) {
  if (redis) {
    await redis.set<T>(key, value, { ex: ttl })
  } else {
    memory.set(key, { value, expires: Date.now() + ttl * 1000 })
  }
}
