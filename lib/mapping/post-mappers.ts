// ✅ Unified WP post mappers + list adapters (resolved merge)

// --- External helpers & types
import { rewriteLegacyLinks } from "@/lib/utils/routing"

// Low-level normalized WordPress types
import type {
  WordPressPost,
  WordPressAuthor,
  WordPressMedia,
  WordPressCategoryConnection,
  WordPressTagConnection,
} from "@/types/wp"

// GraphQL fragments (shape for GQL nodes)
import type { PostFieldsFragment } from "@/types/wpgraphql"

// High-level list view mapping + types
import {
  mapWordPressPostToPostListItem,
  mapWordPressPostsToPostListItems,
  type PostListItemData,
  type PostListAuthor,
  type PostListCategory,
} from "@/lib/data/post-list"

// Re-export list types for convenience
export type { PostListItemData, PostListAuthor, PostListCategory }

// ------------------------------
// Shared helpers
// ------------------------------
function decodeGlobalId(id: string): number {
  try {
    const decoded = Buffer.from(id, "base64").toString("ascii")
    const parts = decoded.split(":")
    return Number(parts[parts.length - 1])
  } catch {
    return Number(id)
  }
}

const extractRendered = (value: string | { rendered?: string } | undefined): string | undefined => {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (typeof value === "object" && value.rendered) return value.rendered
  return undefined
}

const resolveRelayId = (post: RestPost | GraphqlPostNode): string | undefined => {
  const candidate = (post as any)?.globalRelayId ?? (post as any)?.id
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate
  }
  return undefined
}

// ------------------------------
// REST shapes (embedded) → normalize
// ------------------------------
export type RestPost = {
  id?: number
  databaseId?: number
  slug?: string
  date?: string
  modified?: string
  title?: string | { rendered?: string }
  excerpt?: string | { rendered?: string }
  content?: string | { rendered?: string }
  globalRelayId?: string
  link?: string
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

const mapRestFeaturedImage = (post: RestPost): WordPressMedia | undefined => {
  const featured = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!featured) return undefined

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
  if (!author) return undefined

  const databaseId = author.id ?? undefined
  const name = author.name ?? ""
  const slug = author.slug ?? ""

  return {
    id: databaseId,
    databaseId,
    name,
    slug,
    node: {
      databaseId,
      name,
      slug,
    },
  }
}

const mapRestCategories = (post: RestPost): WordPressCategoryConnection => {
  const categoryTerms = post._embedded?.["wp:term"]?.[0] ?? []
  return {
    nodes: categoryTerms
      .filter((cat): cat is NonNullable<typeof cat> => Boolean(cat?.slug))
      .map((cat) => ({
        id: cat.id ?? cat.databaseId ?? undefined,
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
        id: tag.id ?? tag.databaseId ?? undefined,
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
    modified: post.modified ?? undefined,
    title: extractRendered(post.title) ?? "",
    excerpt: extractRendered(post.excerpt) ?? "",
    content: content ? rewriteLegacyLinks(content, countryCode) : undefined,
    link: typeof post.link === "string" ? post.link : undefined,
    featuredImage: mapRestFeaturedImage(post),
    author: mapRestAuthor(post),
    categories: mapRestCategories(post),
    tags: mapRestTags(post),
    globalRelayId: resolveRelayId(post),
  }
}

// ------------------------------
// GraphQL shapes → normalize
// ------------------------------
export type GraphqlPostNode = PostFieldsFragment

const mapGraphqlFeaturedImage = (post: GraphqlPostNode): WordPressMedia | undefined => {
  if (!post.featuredImage?.node) return undefined
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
  if (!post.author?.node) return undefined
  const node = post.author.node
  const databaseId =
    node.databaseId ?? (typeof node.id === "string" ? decodeGlobalId(node.id) : (node as any).id) ?? undefined
  const name = node.name ?? ""
  const slug = node.slug ?? ""
  const avatar =
    typeof node.avatar === "object" && node.avatar !== null && "url" in node.avatar
      ? { url: (node.avatar as { url?: string }).url ?? undefined }
      : undefined
  return {
    id: typeof node.id === "number" ? node.id : databaseId,
    databaseId,
    name,
    slug,
    description: (node as any).description ?? undefined,
    avatar,
    node: {
      id: typeof node.id === "number" ? node.id : undefined,
      databaseId,
      name,
      slug,
      description: (node as any).description ?? undefined,
      avatar,
    },
  }
}

const mapGraphqlCategories = (post: GraphqlPostNode): WordPressCategoryConnection => ({
  nodes:
    post.categories?.nodes
      ?.filter((cat): cat is NonNullable<typeof cat> => Boolean(cat?.slug))
      .map((cat) => ({
        databaseId: cat.databaseId ?? (typeof cat.id === "string" ? decodeGlobalId(cat.id) : (cat as any).id) ?? undefined,
        id:
          (typeof cat.id === "number" ? cat.id : undefined) ??
          (typeof cat.databaseId === "number" ? cat.databaseId : undefined) ??
          (typeof cat.id === "string" ? decodeGlobalId(cat.id) : undefined),
        name: cat.name ?? undefined,
        slug: cat.slug ?? undefined,
        description: (cat as any).description ?? undefined,
        count: (cat as any).count ?? undefined,
      })) ?? [],
})

const mapGraphqlTags = (post: GraphqlPostNode): WordPressTagConnection => ({
  nodes:
    post.tags?.nodes
      ?.filter((tag): tag is NonNullable<typeof tag> => Boolean(tag?.slug))
      .map((tag) => ({
        databaseId: tag.databaseId ?? (typeof tag.id === "string" ? decodeGlobalId(tag.id) : (tag as any).id) ?? undefined,
        id:
          (typeof tag.id === "number" ? tag.id : undefined) ??
          (typeof tag.databaseId === "number" ? tag.databaseId : undefined) ??
          (typeof tag.id === "string" ? decodeGlobalId(tag.id) : undefined),
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
  modified: post.modified ?? undefined,
  title: post.title ?? "",
  excerpt: post.excerpt ?? "",
  content: post.content ? rewriteLegacyLinks(post.content, countryCode) : undefined,
  uri: (post as any).uri ?? undefined,
  link: (post as any).link ?? undefined,
  featuredImage: mapGraphqlFeaturedImage(post),
  author: mapGraphqlAuthor(post),
  categories: mapGraphqlCategories(post),
  tags: mapGraphqlTags(post),
  globalRelayId: resolveRelayId(post),
})

// ------------------------------
// Source switch (REST vs GQL) → WordPressPost
// ------------------------------
export const mapWordPressPostFromSource = (
  post: RestPost | GraphqlPostNode,
  source: "rest" | "gql",
  countryCode?: string,
): WordPressPost => {
  if (source === "rest") {
    const candidate = post as unknown as WordPressPost
    if (
      candidate &&
      typeof candidate === "object" &&
      typeof candidate.title === "string" &&
      (candidate.excerpt === undefined || typeof candidate.excerpt === "string") &&
      (candidate.content === undefined || typeof candidate.content === "string")
    ) {
      return candidate
    }
    return mapRestPostToWordPressPost(post as RestPost, countryCode)
  }
  return mapGraphqlPostToWordPressPost(post as GraphqlPostNode, countryCode)
}

// ------------------------------
// High-level adapters for list UI (kept from Branch A)
// ------------------------------
export function mapWpPostToPostListItem(post: WordPressPost, countryCode: string): PostListItemData {
  return mapWordPressPostToPostListItem(post, countryCode)
}

export function mapWpPostsToPostListItems(
  posts: WordPressPost[] | null | undefined,
  countryCode: string,
): PostListItemData[] {
  return mapWordPressPostsToPostListItems(posts, countryCode)
}
