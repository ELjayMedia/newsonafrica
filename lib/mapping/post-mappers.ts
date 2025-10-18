import {
  mapWordPressPostToPostListItem,
  mapWordPressPostsToPostListItems,
  type PostListItemData,
  type PostListAuthor,
  type PostListCategory,
} from "@/lib/data/post-list"
import type { WordPressPost } from "@/types/wp"

export type { PostListItemData, PostListAuthor, PostListCategory }

export function mapWpPostToPostListItem(post: WordPressPost, countryCode: string): PostListItemData {
  return mapWordPressPostToPostListItem(post, countryCode)
}

export function mapWpPostsToPostListItems(
  posts: WordPressPost[] | null | undefined,
  countryCode: string,
): PostListItemData[] {
  return mapWordPressPostsToPostListItems(posts, countryCode)
}
import { rewriteLegacyLinks } from "@/lib/utils/routing"
import type { WordPressPost } from "@/lib/wordpress/client"
import type { HomePostFieldsFragment, PostFieldsFragment } from "@/types/wpgraphql"
import type {
  WordPressAuthor,
  WordPressMedia,
  WordPressCategoryConnection,
  WordPressTagConnection,
} from "@/types/wp"

function decodeGlobalId(id: string): number {
  try {
    const decoded = Buffer.from(id, "base64").toString("ascii")
    const parts = decoded.split(":")
    return Number(parts[parts.length - 1])
  } catch {
    return Number(id)
  }
}

type RestPost = {
  id?: number
  databaseId?: number
  slug?: string
  date?: string
  title?: string | { rendered?: string }
  excerpt?: string | { rendered?: string }
  content?: string | { rendered?: string }
  globalRelayId?: string
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string
      alt_text?: string
      media_details?: { width?: number; height?: number }
      caption?: string
    }>
    "wp:author"?: Array<{ id?: number; name?: string; slug?: string }>
    "wp:term"?: Array<Array<{ id?: number; databaseId?: number; name?: string; slug?: string }>>
  }
}

const extractRendered = (value: string | { rendered?: string } | undefined): string | undefined => {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object" && value.rendered) return value.rendered
  return undefined
}

type GraphqlPostNode = PostFieldsFragment | HomePostFieldsFragment

const resolveRelayId = (post: RestPost | GraphqlPostNode): string | undefined => {
  const candidate = (post as any)?.globalRelayId ?? (post as any)?.id
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate
  }
  return undefined
}

const mapRestFeaturedImage = (post: RestPost): WordPressMedia | undefined => {
  const featured = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!featured) {
    return undefined
  }

  return {
    node: {
      sourceUrl: featured.source_url ?? undefined,
      altText: featured.alt_text ?? undefined,
      caption: featured.caption ?? undefined,
      mediaDetails: featured.media_details
        ? {
            width: featured.media_details.width ?? undefined,
            height: featured.media_details.height ?? undefined,
          }
        : undefined,
    },
  }
}

const mapRestAuthor = (post: RestPost): WordPressAuthor | undefined => {
  const author = post._embedded?.["wp:author"]?.[0]
  if (!author) {
    return undefined
  }

  return {
    node: {
      databaseId: author.id ?? undefined,
      name: author.name ?? undefined,
      slug: author.slug ?? undefined,
    },
  }
}

const mapRestCategories = (post: RestPost): WordPressCategoryConnection => {
  const categoryTerms = post._embedded?.["wp:term"]?.[0] ?? []

  return {
    nodes: categoryTerms
      .filter((cat): cat is NonNullable<typeof cat> => Boolean(cat?.slug))
      .map((cat) => ({
        databaseId: cat.databaseId ?? cat.id ?? undefined,
        name: cat.name ?? undefined,
        slug: cat.slug ?? undefined,
      })),
  }
}

const mapRestTags = (post: RestPost): WordPressTagConnection => {
  const tagTerms = post._embedded?.["wp:term"]?.[1] ?? []

  return {
    nodes: tagTerms
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag?.slug))
      .map((tag) => ({
        databaseId: tag.databaseId ?? tag.id ?? undefined,
        name: tag.name ?? undefined,
        slug: tag.slug ?? undefined,
      })),
  }
}

export const mapRestPostToWordPressPost = (post: RestPost, countryCode?: string): WordPressPost => {
  const content = extractRendered(post.content)

  return {
    databaseId: post.databaseId ?? post.id ?? undefined,
    id: post.id !== undefined ? String(post.id) : undefined,
    slug: post.slug ?? undefined,
    date: post.date ?? undefined,
    title: extractRendered(post.title) ?? "",
    excerpt: extractRendered(post.excerpt) ?? "",
    content: content ? rewriteLegacyLinks(content, countryCode) : undefined,
    featuredImage: mapRestFeaturedImage(post),
    author: mapRestAuthor(post),
    categories: mapRestCategories(post),
    tags: mapRestTags(post),
    globalRelayId: resolveRelayId(post),
  }
}

const mapGraphqlFeaturedImage = (post: GraphqlPostNode): WordPressMedia | undefined => {
  if (!post.featuredImage?.node) {
    return undefined
  }

  const node = post.featuredImage.node

  return {
    node: {
      sourceUrl: node.sourceUrl ?? undefined,
      altText: node.altText ?? undefined,
      caption: node.caption ?? undefined,
      mediaDetails: node.mediaDetails
        ? {
            width: node.mediaDetails.width ?? undefined,
            height: node.mediaDetails.height ?? undefined,
          }
        : undefined,
    },
  }
}

const mapGraphqlAuthor = (post: GraphqlPostNode): WordPressAuthor | undefined => {
  if (!post.author?.node) {
    return undefined
  }

  const node = post.author.node

  return {
    node: {
      databaseId: node.databaseId ?? (typeof node.id === "string" ? decodeGlobalId(node.id) : node.id) ?? undefined,
      name: node.name ?? undefined,
      slug: node.slug ?? undefined,
      avatar: typeof node.avatar === "object" && node.avatar !== null && "url" in node.avatar
        ? { url: (node.avatar as { url?: string }).url ?? undefined }
        : undefined,
    },
  }
}

const mapGraphqlCategories = (post: GraphqlPostNode): WordPressCategoryConnection => ({
  nodes:
    post.categories?.nodes
      ?.filter((cat): cat is NonNullable<typeof cat> => Boolean(cat?.slug))
      .map((cat) => ({
        databaseId: cat.databaseId ?? (typeof cat.id === "string" ? decodeGlobalId(cat.id) : cat.id) ?? undefined,
        name: cat.name ?? undefined,
        slug: cat.slug ?? undefined,
        description: cat.description ?? undefined,
        count: cat.count ?? undefined,
      })) ?? [],
})

const mapGraphqlTags = (post: GraphqlPostNode): WordPressTagConnection => ({
  nodes:
    post.tags?.nodes
      ?.filter((tag): tag is NonNullable<typeof tag> => Boolean(tag?.slug))
      .map((tag) => ({
        databaseId: tag.databaseId ?? (typeof tag.id === "string" ? decodeGlobalId(tag.id) : tag.id) ?? undefined,
        name: tag.name ?? undefined,
        slug: tag.slug ?? undefined,
      })) ?? [],
})

export const mapGraphqlPostToWordPressPost = (
  post: GraphqlPostNode,
  countryCode?: string,
): WordPressPost => ({
  databaseId: post.databaseId ?? undefined,
  id: post.id ?? undefined,
  slug: post.slug ?? undefined,
  date: post.date ?? undefined,
  title: post.title ?? "",
  excerpt: post.excerpt ?? "",
  content: post.content ? rewriteLegacyLinks(post.content, countryCode) : undefined,
  featuredImage: mapGraphqlFeaturedImage(post),
  author: mapGraphqlAuthor(post),
  categories: mapGraphqlCategories(post),
  tags: mapGraphqlTags(post),
  globalRelayId: resolveRelayId(post),
})

export const mapWordPressPostFromSource = (
  post: RestPost | GraphqlPostNode,
  source: "rest" | "gql",
  countryCode?: string,
): WordPressPost => {
  if (source === "rest") {
    const candidate = post as WordPressPost
    if (candidate && typeof candidate === "object" && "title" in candidate && "categories" in candidate) {
      return candidate
    }
    return mapRestPostToWordPressPost(post as RestPost, countryCode)
  }

  return mapGraphqlPostToWordPressPost(post as GraphqlPostNode, countryCode)
}

export type { RestPost, GraphqlPostNode }
