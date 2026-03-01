import "server-only"

import { ENV } from "@/config/env"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers.server"
import { POST_BY_DATABASE_ID_QUERY, POST_BY_SLUG_DIRECT_QUERY } from "@/lib/wordpress/queries"
import { type EditionCode, WORDPRESS_EDITIONS_REGISTRY } from "@/lib/wordpress/editions-registry"
import { fetchWordPressGraphQL, type WordPressGraphQLFailure, type WordPressGraphQLResult } from "@/lib/wordpress/client"
import type { WordPressPost } from "@/types/wp"
import type { PostFieldsFragment } from "@/types/wpgraphql"

const EDITION_CODES: EditionCode[] = ["sz", "za", "ng"]

type PostByDirectSlugQueryResult = { post?: PostFieldsFragment | null }

type PostByDatabaseIdQueryResult = { post?: PostFieldsFragment | null }

type LoadArticleResult =
  | { status: "found"; article: WordPressPost; version: string | null }
  | { status: "not_found" }
  | { status: "temporary_error"; error: unknown; failure?: WordPressGraphQLFailure }

export type GetArticleBySlugResult = {
  status: "found" | "not_found" | "temporary_error"
  article: WordPressPost | null
  sourceCountryCode: EditionCode | null
  canonicalCountryCode: EditionCode | null
  version: string | null
  failures?: { country: EditionCode; error: unknown }[]
}

const normalizeCountryCode = (countryCode: string): EditionCode =>
  (EDITION_CODES.includes(countryCode.toLowerCase() as EditionCode)
    ? countryCode.toLowerCase()
    : ENV.NEXT_PUBLIC_DEFAULT_SITE) as EditionCode

const normalizeSlug = (slug: string) => slug.toLowerCase().trim()

const parseStableId = (slug: string): number | null => {
  const candidate = normalizeSlug(slug).split("-").at(-1)
  if (!candidate || !/^\d+$/.test(candidate)) return null
  const id = Number.parseInt(candidate, 10)
  return Number.isFinite(id) ? id : null
}

const resolveVersion = (article: WordPressPost): string | null => {
  const raw = article?.modified ?? article?.date ?? (article?.databaseId ? `db-${article.databaseId}` : null)
  return raw ? String(raw) : null
}

const queryArticle = async (
  countryCode: EditionCode,
  slug: string,
  preview: boolean,
  stableId?: number | null,
): Promise<LoadArticleResult> => {
  const fetchOptions = preview ? { revalidate: CACHE_DURATIONS.NONE } : { tags: [`wp:${countryCode}:latest`] }

  try {
    let result: WordPressGraphQLResult<PostByDirectSlugQueryResult | PostByDatabaseIdQueryResult>

    if (typeof stableId === "number") {
      result = await fetchWordPressGraphQL<PostByDatabaseIdQueryResult>(
        countryCode,
        POST_BY_DATABASE_ID_QUERY,
        { id: stableId, asPreview: preview },
        fetchOptions,
      )
    } else {
      result = await fetchWordPressGraphQL<PostByDirectSlugQueryResult>(
        countryCode,
        POST_BY_SLUG_DIRECT_QUERY,
        { slug, asPreview: preview },
        fetchOptions,
      )
    }

    if (!result.ok) {
      if (result.kind === "graphql_error") {
        return { status: "not_found" }
      }

      return { status: "temporary_error", error: result.error, failure: result }
    }

    const node = result.post ?? null

    if (!node) return { status: "not_found" }

    const article = mapGraphqlPostToWordPressPost(node, countryCode)
    return { status: "found", article, version: resolveVersion(article) }
  } catch (error) {
    return { status: "temporary_error", error }
  }
}

const getFallbackCountries = (primary: EditionCode): EditionCode[] => {
  const configured: EditionCode[] = EDITION_CODES.filter((code) => Boolean(WORDPRESS_EDITIONS_REGISTRY[code]?.graphql))
  const priority = [primary, ENV.NEXT_PUBLIC_DEFAULT_SITE as EditionCode, ...configured]
  return Array.from(new Set(priority)).filter((code): code is EditionCode => EDITION_CODES.includes(code))
}

export async function getArticleBySlug({
  countryCode,
  slug,
  preview = false,
}: {
  countryCode: string
  slug: string
  preview?: boolean
}): Promise<GetArticleBySlugResult> {
  const normalizedCountry = normalizeCountryCode(countryCode)
  const normalizedSlug = normalizeSlug(slug)
  const stableId = parseStableId(normalizedSlug)
  const failures: { country: EditionCode; error: unknown }[] = []

  for (const country of getFallbackCountries(normalizedCountry)) {
    const loaded = await queryArticle(country, normalizedSlug, preview, stableId)

    if (loaded.status === "found") {
      return {
        status: "found",
        article: loaded.article,
        sourceCountryCode: country,
        canonicalCountryCode: country,
        version: loaded.version,
      }
    }

    if (loaded.status === "temporary_error") {
      failures.push({ country, error: loaded.error })
    }
  }

  if (failures.length > 0) {
    return {
      status: "temporary_error",
      article: null,
      sourceCountryCode: normalizedCountry,
      canonicalCountryCode: normalizedCountry,
      version: null,
      failures,
    }
  }

  return {
    status: "not_found",
    article: null,
    sourceCountryCode: null,
    canonicalCountryCode: null,
    version: null,
  }
}
