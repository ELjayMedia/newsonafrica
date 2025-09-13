import { getWpEndpoints } from "@/config/wp"

/**
 * Get base URL for WordPress site for a given ISO code in multisite mode
 */
export function getCountryBaseUrl(iso: string) {
  const endpoints = getWpEndpoints(iso)
  // remove trailing wp-json/wp/v2 if present
  return endpoints.rest.replace(/\/wp-json\/wp\/v2$/, "")
}

/**
 * Resolve a country slug to its taxonomy term ID (single site mode)
 */
export async function resolveCountryTermId(slug: string): Promise<number | null> {
  const base = getCountryBaseUrl(process.env.NEXT_PUBLIC_DEFAULT_SITE || "")
  const res = await fetch(`${base}/wp-json/wp/v2/countries?slug=${slug}`)
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0]?.id ?? null
}

export interface FetchPostsArgs {
  countryIso?: string
  countryTermId?: number
  section?: string
  page?: number
  perPage?: number
  ids?: (number | string)[]
}

const DEFAULT_FIELDS = ["id", "date", "slug", "title", "excerpt"]

/**
 * Fetch posts from WordPress REST API with country awareness
 */
export async function fetchPosts({
  countryIso,
  countryTermId,
  section,
  page = 1,
  perPage = 10,
  ids,
}: FetchPostsArgs) {
  const base = getWpEndpoints(countryIso).rest
  const params = new URLSearchParams({
    _embed: "1",
    _fields: DEFAULT_FIELDS.join(","),
    page: String(page),
    per_page: String(perPage),
  })
  if (section) params.set("categories", section)
  if (countryTermId) params.set("countries", String(countryTermId))
  if (ids && ids.length) params.set("include", ids.join(","))
  const url = `${base}/posts?${params.toString()}`
  const res = await fetch(url)
  const total = Number(res.headers.get("X-WP-Total") || "0")
  const data = await res.json()
  return { data, total }
}

/**
 * Fetch categories from WordPress
 */
export async function fetchCategories(countryIso?: string) {
  const base = getWpEndpoints(countryIso).rest
  const res = await fetch(`${base}/categories?per_page=100&_fields=id,name,slug`)
  return res.json()
}

/**
 * Fetch related posts either via ACF related_posts or tag intersection
 */
export async function fetchRelated({
  postId,
  countryIso,
}: {
  postId: number | string
  countryIso: string
}) {
  const base = getWpEndpoints(countryIso).rest
  const postRes = await fetch(`${base}/posts/${postId}?_embed=1`)
  if (!postRes.ok) return []
  const post = await postRes.json()
  const acfRelated = post?.acf?.related_posts
  if (acfRelated && Array.isArray(acfRelated) && acfRelated.length > 0) {
    const ids = acfRelated.map((p: any) => p?.ID || p)
    const { data } = await fetchPosts({ countryIso, ids })
    return data
  }
  const tagIds: number[] = post?.tags || []
  if (!tagIds.length) return []
  const params = new URLSearchParams({
    tags: tagIds.join(","),
    per_page: "6",
    _embed: "1",
  })
  if (post?.countries?.length) params.set("countries", post.countries.join(","))
  const res = await fetch(`${base}/posts?${params.toString()}`)
  return res.json()
}
