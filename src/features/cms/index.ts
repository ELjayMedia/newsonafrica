import { wpRest } from '@/lib/wpClient'
import { wpPostSchema, wpCategorySchema } from '@/types/wp'
import { getCache, setCache } from '@/lib/cache'

async function fetchJson<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed fetch ${url}`)
  return (await res.json()) as T
}

export async function getCategories(country: string) {
  const key = `menu:${country}`
  const cached = await getCache(key)
  if (cached) return cached
  const data = await fetchJson(wpRest(country) + '/categories')
  const parsed = wpCategorySchema.array().parse(data)
  await setCache(key, parsed, 3600)
  return parsed
}

export async function getFrontPage(country: string) {
  const key = `frontpage:${country}`
  const cached = await getCache(key)
  if (cached) return cached
  const data = await fetchJson(wpRest(country) + '/posts?featured=true')
  const parsed = wpPostSchema.array().parse(data)
  await setCache(key, parsed, 600)
  return parsed
}
