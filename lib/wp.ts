import { getWordPressAuthorizationHeader } from "./wordpress/auth"

export type CountryCode = "sz" | "za"

const REST_BASES: Record<CountryCode, string> = {
  sz: process.env.NEXT_PUBLIC_WP_SZ_REST_BASE || "",
  za: process.env.NEXT_PUBLIC_WP_ZA_REST_BASE || "",
}

function restBase(country: CountryCode) {
  const base = REST_BASES[country]?.trim()
  if (!base) throw new Error(`Missing REST base for country ${country}`)
  return base.endsWith("/") ? base : `${base}/`
}

const buildAuthorizationHeaders = (): Record<string, string> => {
  const authorization = getWordPressAuthorizationHeader()
  if (!authorization) {
    return {}
  }

  return { Authorization: authorization }
}

interface BuildHeadersOptions {
  auth?: boolean
}

export const buildHeaders = (options: BuildHeadersOptions = {}): HeadersInit => {
  if (!options.auth) {
    return {}
  }

  return buildAuthorizationHeaders()
}

async function wpGet<T>(country: CountryCode, path: string, params?: Record<string, any>) {
  const normalizedPath = path.replace(/^\/+/, "")
  const url = new URL(normalizedPath, restBase(country))
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    next: { revalidate: 60, tags: [`country:${country}`] },
    headers: buildHeaders({ auth: true }),
  })

  if (!res.ok) {
    throw new Error(`WP ${country} GET ${url} -> ${res.status}`)
  }
  return res.json() as Promise<T>
}

// --- Public API ---
export type WpPost = {
  id: number
  date: string
  slug: string
  link: string
  title: { rendered: string }
  excerpt?: { rendered: string }
  content?: { rendered: string }
  _embedded?: any
}

export async function getLatestPosts(country: CountryCode, perPage = 12) {
  return wpGet<WpPost[]>(country, "posts", { per_page: perPage, _embed: 1, order: "desc", orderby: "date" })
}

export async function getPostBySlug(country: CountryCode, slug: string) {
  const arr = await wpGet<WpPost[]>(country, "posts", { slug, _embed: 1, per_page: 1 })
  return arr?.[0] ?? null
}

export async function getCategories(country: CountryCode, perPage = 20) {
  return wpGet<any[]>(country, "categories", { per_page: perPage, hide_empty: false })
}

export function isSupportedCountry(cc: string): cc is CountryCode {
  return cc === "sz" || cc === "za"
}
