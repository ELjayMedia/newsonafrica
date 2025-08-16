import { cacheGet, cacheSet } from '@/lib/cache'
import { restEndpoint } from '@/lib/wpClient'
import { WpCategorySchema, WpPostSchema } from '@/types/wp'

export async function fetchCategories(country?: string) {
  const key = `menu:${country || process.env.NEXT_PUBLIC_WORDPRESS_COUNTRY_CODE || ''}`
  const cached = await cacheGet<unknown>(key)
  if (cached) return cached
  const res = await fetch(restEndpoint('/categories', country))
  const data = await res.json()
  const categories = WpCategorySchema.array().parse(data)
  await cacheSet(key, categories, 1800)
  return categories
}

export async function fetchFrontPagePosts(country?: string) {
  const key = `frontpage:${country || process.env.NEXT_PUBLIC_WORDPRESS_COUNTRY_CODE || ''}`
  const cached = await cacheGet<unknown>(key)
  if (cached) return cached
  const res = await fetch(restEndpoint('/posts', country))
  const data = await res.json()
  const posts = WpPostSchema.array().parse(data)
  await cacheSet(key, posts, 600)
  return posts
}
