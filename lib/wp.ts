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

export interface FetchPostArgs {
  slug: string
  countryIso?: string
  countryTermId?: number
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
 * Fetch a single post by slug with optional country filtering
 */
export async function fetchPost({
  slug,
  countryIso,
  countryTermId,
}: FetchPostArgs) {
  const base = getWpEndpoints(countryIso).rest
  const params = new URLSearchParams({ _embed: "1", slug })
  if (countryTermId) params.set("countries", String(countryTermId))
  const res = await fetch(`${base}/posts?${params.toString()}`)
  if (!res.ok) return null
  const posts = await res.json()
  const post = posts?.[0]
  if (!post) return null
  const featured = post._embedded?.["wp:featuredmedia"]?.[0]
  const author = post._embedded?.["wp:author"]?.[0]
  return {
    ...post,
    title: post.title?.rendered || post.title,
    excerpt: post.excerpt?.rendered || post.excerpt,
    content: post.content?.rendered || post.content,
    featuredImage: featured
      ? {
          node: {
            sourceUrl: featured.source_url,
            altText: featured.alt_text || "",
          },
        }
      : undefined,
    author: author
      ? { node: { id: author.id, name: author.name, slug: author.slug } }
      : undefined,
    categories: {
      nodes:
        post._embedded?.["wp:term"]?.[0]?.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })) || [],
    },
    tags: {
      nodes:
        post._embedded?.["wp:term"]?.[1]?.map((tag: any) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })) || [],
    },
  }
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
