import { CACHE_DURATIONS } from "../cache/constants"
import { cacheTags } from "../cache/cacheTags"
import { AUTHOR_DATA_QUERY, AUTHORS_QUERY } from "@/lib/wordpress/queries"
import { fetchWordPressGraphQL } from "./client"
import type { AuthorDataQuery, AuthorsQuery } from "@/types/wpgraphql"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY } from "./shared"
import type { WordPressAuthor, WordPressPost } from "@/types/wp"

const normalizeRenderedText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const coerceToNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      return numeric
    }

    try {
      const decoded = Buffer.from(value, "base64").toString("ascii")
      const parts = decoded.split(":")
      const maybeNumber = Number(parts[parts.length - 1])
      if (!Number.isNaN(maybeNumber)) {
        return maybeNumber
      }
    } catch {
      // Ignore decoding errors
    }
  }

  return undefined
}

const selectAvatarUrl = (
  avatar: { url?: string | null } | null | undefined,
): { url?: string } | undefined => {
  if (!avatar || typeof avatar !== "object") return undefined
  const url = typeof avatar.url === "string" ? avatar.url : undefined
  return url ? { url } : undefined
}

type GraphqlAuthorLike =
  | NonNullable<AuthorDataQuery["user"]>
  | NonNullable<NonNullable<NonNullable<AuthorsQuery["users"]>["nodes"]>[number]>

const mapGraphqlAuthorToWordPressAuthor = (
  author: GraphqlAuthorLike,
  slugFallback: string,
): WordPressAuthor => {
  const databaseId = coerceToNumber(author.databaseId ?? author.id)
  const description = normalizeRenderedText(author.description ?? undefined)
  const avatar = selectAvatarUrl(author.avatar ?? undefined)
  const slug = author.slug ?? slugFallback
  const name = author.name ?? ""

  return {
    id: databaseId,
    databaseId,
    name,
    slug,
    description,
    avatar,
    node: {
      id: typeof author.id === "number" ? author.id : undefined,
      databaseId,
      name,
      slug,
      description,
      avatar,
    },
  }
}

export const fetchAuthors = async (countryCode = DEFAULT_COUNTRY): Promise<WordPressAuthor[]> => {
  const tags = [cacheTags.edition(countryCode)]
  const data = await fetchWordPressGraphQL<AuthorsQuery>(
    countryCode,
    AUTHORS_QUERY,
    { first: 100 },
    { tags, revalidate: CACHE_DURATIONS.NONE },
  )

  if (!data.ok) {
    return []
  }

  const nodes =
    data.users?.nodes?.filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? []

  return nodes.map((node) => mapGraphqlAuthorToWordPressAuthor(node, node.slug ?? ""))
}

interface AuthorPostsResult {
  author: WordPressAuthor
  posts: {
    nodes: WordPressPost[]
    pageInfo: {
      endCursor: string | null
      hasNextPage: boolean
    }
  }
}

export async function fetchAuthorData(
  slug: string,
  cursor: string | null = null,
  countryCode = DEFAULT_COUNTRY,
  limit = 10,
): Promise<AuthorPostsResult | null> {
  const tags = [cacheTags.edition(countryCode), cacheTags.author(countryCode, slug)]
  const variables: Record<string, string | number | boolean | string[]> = {
    slug,
    first: limit,
  }

  if (cursor) {
    variables.after = cursor
  }

  const data = await fetchWordPressGraphQL<AuthorDataQuery>(
    countryCode,
    AUTHOR_DATA_QUERY,
    variables,
    { tags, revalidate: CACHE_DURATIONS.NONE },
  )
  if (!data.ok || !data.user) return null
  const author = mapGraphqlAuthorToWordPressAuthor(data.user, slug)
  const nodes = data.user.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
  return {
    author,
    posts: {
      nodes: nodes.map((p) => mapGraphqlPostToWordPressPost(p, countryCode)),
      pageInfo: {
        ...data.user.posts.pageInfo,
        endCursor: data.user.posts.pageInfo.endCursor ?? null,
      },
    },
  }
}

interface AuthorLookupResult {
  author: WordPressAuthor
  posts: WordPressPost[]
  pageInfo?: {
    endCursor: string | null
    hasNextPage: boolean
  }
}

export async function getAuthorBySlug(
  slug: string,
  { countryCode = DEFAULT_COUNTRY, postLimit = 12 }: { countryCode?: string; postLimit?: number } = {},
): Promise<AuthorLookupResult | null> {
  const authorData = await fetchAuthorData(slug, null, countryCode, postLimit)
  if (!authorData) {
    return null
  }

  return {
    author: authorData.author,
    posts: authorData.posts.nodes,
    pageInfo: authorData.posts.pageInfo,
  }
}
