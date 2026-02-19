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
import type { PostFieldsFragment, PostSummaryFieldsFragment } from "@/types/wpgraphql"

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

const resolveRelayId = (
  post: GraphqlPostNode | { globalRelayId?: unknown; id?: unknown },
): string | undefined => {
  const candidate = (post as any)?.globalRelayId ?? (post as any)?.id
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate
  }
  return undefined
}

// ------------------------------
// GraphQL shapes → normalize
// ------------------------------
export type GraphqlPostNode = PostFieldsFragment | PostSummaryFieldsFragment

const hasRenderedContent = (post: GraphqlPostNode): post is PostFieldsFragment =>
  typeof (post as { content?: unknown }).content === "string"

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
  const nodeRecord = node as Record<string, unknown>
  const rawNodeId = nodeRecord.id
  const resolvedNodeId = typeof rawNodeId === "number" ? rawNodeId : typeof rawNodeId === "string" ? decodeGlobalId(rawNodeId) : undefined
  const databaseId = node.databaseId ?? resolvedNodeId
  const name = node.name ?? ""
  const slug = node.slug ?? ""
  const avatar =
    typeof node.avatar === "object" && node.avatar !== null && "url" in node.avatar
      ? { url: (node.avatar as { url?: string }).url ?? undefined }
      : undefined
  return {
    id: resolvedNodeId ?? databaseId,
    databaseId,
    name,
    slug,
    description: (node as any).description ?? undefined,
    avatar,
    node: {
      id: resolvedNodeId,
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
      .map((cat) => {
        const catRecord = cat as Record<string, unknown>
        const rawCatId = catRecord.id
        const resolvedCatId =
          typeof rawCatId === "number" ? rawCatId : typeof rawCatId === "string" ? decodeGlobalId(rawCatId) : undefined

        return {
        databaseId: cat.databaseId ?? resolvedCatId,
        id:
          resolvedCatId ??
          (typeof cat.databaseId === "number" ? cat.databaseId : undefined) ??
          undefined,
        name: cat.name ?? undefined,
        slug: cat.slug ?? undefined,
        description: (cat as any).description ?? undefined,
        count: (cat as any).count ?? undefined,
      }}) ?? [],
})

const mapGraphqlTags = (post: GraphqlPostNode): WordPressTagConnection => ({
  nodes:
    post.tags?.nodes
      ?.filter((tag): tag is NonNullable<typeof tag> => Boolean(tag?.slug))
      .map((tag) => {
        const tagRecord = tag as Record<string, unknown>
        const rawTagId = tagRecord.id
        const resolvedTagId =
          typeof rawTagId === "number" ? rawTagId : typeof rawTagId === "string" ? decodeGlobalId(rawTagId) : undefined

        return {
        databaseId: tag.databaseId ?? resolvedTagId,
        id:
          resolvedTagId ??
          (typeof tag.databaseId === "number" ? tag.databaseId : undefined) ??
          undefined,
        name: tag.name ?? undefined,
        slug: tag.slug ?? undefined,
      }}) ?? [],
})

export const mapGraphqlPostToWordPressPost = (
  post: GraphqlPostNode,
  countryCode?: string,
): WordPressPost => {
  const rawContent = hasRenderedContent(post) ? post.content : undefined

  return {
    databaseId: post.databaseId ?? undefined,
    id: post.id ?? undefined,
    slug: post.slug ?? undefined,
    date: post.date ?? undefined,
    modified: post.modified ?? undefined,
    title: post.title ?? "",
    excerpt: post.excerpt ?? "",
    content:
      typeof rawContent === "string" && rawContent.length > 0
        ? rewriteLegacyLinks(rawContent, countryCode)
        : undefined,
    uri: (post as any).uri ?? undefined,
    link: (post as any).link ?? undefined,
    featuredImage: mapGraphqlFeaturedImage(post),
    author: mapGraphqlAuthor(post),
    categories: mapGraphqlCategories(post),
    tags: mapGraphqlTags(post),
    globalRelayId: resolveRelayId(post),
  }
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
