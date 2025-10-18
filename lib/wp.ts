import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { getRestBase } from "@/lib/wp-endpoints"

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]["code"]

const REST_BASES = SUPPORTED_COUNTRIES.reduce<Record<CountryCode, string>>((acc, edition) => {
  const code = edition.code as CountryCode
  acc[code] = getRestBase(code)
  return acc
}, {} as Record<CountryCode, string>)

const SUPPORTED_COUNTRY_CODES = new Set<CountryCode>(
  SUPPORTED_COUNTRIES.map((country) => country.code as CountryCode),
)

function restBase(country: CountryCode) {
  const base = REST_BASES[country]?.trim()
  if (!base) throw new Error(`Missing REST base for country ${country}`)
  return base.endsWith("/") ? base : `${base}/`
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {}

  const username = process.env.WP_APP_USERNAME
  const password = process.env.WP_APP_PASSWORD
  if (username && password) {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64")
    headers["Authorization"] = `Basic ${credentials}`
  }
  // Note: If no credentials, WordPress allows public access to public posts

  return headers
}

async function wpGet<T>(country: CountryCode, path: string, params?: Record<string, any>) {
  const normalizedPath = path.replace(/^\/+/, "")
  const url = new URL(normalizedPath, restBase(country))
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    next: { revalidate: 60, tags: [`country:${country}`] },
    headers: getAuthHeaders(),
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
  return SUPPORTED_COUNTRY_CODES.has(cc as CountryCode)
}
