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
