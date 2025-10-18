import { buildCacheTags } from "../cache/tag-utils"
import { AUTHOR_DATA_QUERY, wordpressQueries } from "../wordpress-queries"
import { executeRestFallback, fetchFromWp, fetchFromWpGraphQL } from "./client"
import type { AuthorDataQuery } from "@/types/wpgraphql"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers"
import { DEFAULT_COUNTRY } from "./shared"
import type { WordPressAuthor, WordPressPost } from "./types"

export const fetchAuthors = async (countryCode = DEFAULT_COUNTRY) => {
  const { endpoint, params } = wordpressQueries.authors()
  const tags = buildCacheTags({ country: countryCode, section: "authors" })
  return (await fetchFromWp<WordPressAuthor[]>(countryCode, { endpoint, params }, { tags })) || []
}

export async function fetchAuthorData(
  slug: string,
  cursor: string | null = null,
  countryCode = DEFAULT_COUNTRY,
  limit = 10,
) {
  const tags = buildCacheTags({
    country: countryCode,
    section: "authors",
    extra: [`author:${slug}`],
  })

  const data = await fetchFromWpGraphQL<AuthorDataQuery>(
    countryCode,
    AUTHOR_DATA_QUERY,
    {
      slug,
      after: cursor,
      first: limit,
    },
    tags,
  )
  if (!data?.user) return null
  const nodes = data.user.posts.nodes?.filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? []
  return {
    ...data.user,
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

const coerceToNumber = (value: unknown): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
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
  return 0
}

const selectAvatarUrl = (avatar: any): { url?: string } | undefined => {
  if (!avatar) return undefined
  if (typeof avatar === "object" && "url" in avatar) {
    const url = (avatar as { url?: string }).url
    return url ? { url } : undefined
  }
  if (typeof avatar === "object" && "96" in avatar) {
    const urls = avatar as Record<string, string>
    return {
      url: urls["96"] || urls["48"] || urls["24"],
    }
  }
  return undefined
}

export async function getAuthorBySlug(
  slug: string,
  { countryCode = DEFAULT_COUNTRY, postLimit = 12 }: { countryCode?: string; postLimit?: number } = {},
): Promise<AuthorLookupResult | null> {
  const cacheTags = buildCacheTags({
    country: countryCode,
    section: "authors",
    extra: [`author:${slug}`],
  })

  const gqlAuthor = await fetchAuthorData(slug, null, countryCode, postLimit)
  if (gqlAuthor) {
    return {
      author: {
        id: coerceToNumber(gqlAuthor.databaseId ?? gqlAuthor.id),
        name: gqlAuthor.name,
        slug: gqlAuthor.slug,
        description: gqlAuthor.description ?? undefined,
        avatar: selectAvatarUrl(gqlAuthor.avatar),
      },
      posts: gqlAuthor.posts.nodes ?? [],
      pageInfo: gqlAuthor.posts.pageInfo,
    }
  }

  const restAuthors = await executeRestFallback(
    () =>
      fetchFromWp<any[]>(
        countryCode,
        {
          endpoint: "users",
          params: { slug },
        },
        { tags: cacheTags },
      ),
    `[v0] Author REST fallback failed for ${slug} (${countryCode})`,
    { countryCode, slug },
    { fallbackValue: [] },
  )

  const restAuthor = restAuthors[0]
  if (!restAuthor) {
    return null
  }

  const query = wordpressQueries.posts({
    page: 1,
    perPage: postLimit,
    author: String(restAuthor.id),
  })
  const posts = await executeRestFallback(
    () => fetchFromWp<WordPressPost[]>(countryCode, query, { tags: cacheTags }),
    `[v0] Author posts REST fallback failed for ${slug} (${countryCode})`,
    {
      countryCode,
      slug,
      authorId: restAuthor.id,
      postLimit,
      endpoint: query.endpoint,
      params: query.params,
    },
    { fallbackValue: [] },
  )

  return {
    author: {
      id: restAuthor.id,
      name: restAuthor.name,
      slug: restAuthor.slug,
      description: restAuthor.description || undefined,
      avatar: selectAvatarUrl(restAuthor.avatar_urls),
    },
    posts,
  }
}
