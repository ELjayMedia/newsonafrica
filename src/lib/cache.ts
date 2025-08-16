import { Redis } from '@upstash/redis'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null

const memory = new Map<string, { value: unknown; expire: number }>()

export async function getCache<T>(key: string): Promise<T | null> {
  if (redis) {
    return ((await redis.get(key)) as T) ?? null
  }
  const item = memory.get(key)
  if (!item) return null
  if (Date.now() > item.expire) {
    memory.delete(key)
    return null
  }
  return item.value as T
}

export async function setCache<T>(key: string, value: T, ttl: number) {
  if (redis) {
    await redis.set(key, value, { ex: ttl })
    return
  }
  memory.set(key, { value, expire: Date.now() + ttl * 1000 })
}
