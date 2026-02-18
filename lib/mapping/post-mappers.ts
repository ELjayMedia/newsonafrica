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
const resolveRelayId = (
  post: GraphqlPostNode | { globalRelayId?: unknown; id?: unknown },
): string | undefined => {
  const candidate = post.globalRelayId ?? post.id
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate
  }
  return undefined
}

// ------------------------------
// GraphQL shapes → normalize
// ------------------------------
export type GraphqlPostNode = PostFieldsFragment | PostSummaryFieldsFragment

type GraphqlAuthorNode = NonNullable<NonNullable<GraphqlPostNode["author"]>["node"]>
type GraphqlCategoryNode = NonNullable<NonNullable<NonNullable<GraphqlPostNode["categories"]>["nodes"]>[number]>
type GraphqlTagNode = NonNullable<NonNullable<NonNullable<GraphqlPostNode["tags"]>["nodes"]>[number]>

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
  const node: GraphqlAuthorNode = post.author.node
  const databaseId = node.databaseId ?? undefined
  const name = node.name ?? ""
  const slug = node.slug ?? ""
  const avatar = node.avatar?.url ? { url: node.avatar.url ?? undefined } : undefined

  return {
    id: databaseId,
    databaseId,
    name,
    slug,
    description: node.description ?? undefined,
    avatar,
    node: {
      databaseId,
      name,
      slug,
      description: node.description ?? undefined,
      avatar,
    },
  }
}

const mapGraphqlCategoryNode = (cat: GraphqlCategoryNode) => {
  const databaseId = cat.databaseId ?? undefined

  return {
    databaseId,
    id: databaseId,
    name: cat.name ?? undefined,
    slug: cat.slug ?? undefined,
    description: cat.description ?? undefined,
    count: cat.count ?? undefined,
  }
}

const mapGraphqlTagNode = (tag: GraphqlTagNode) => {
  const databaseId = tag.databaseId ?? undefined

  return {
    databaseId,
    id: databaseId,
    name: tag.name ?? undefined,
    slug: tag.slug ?? undefined,
  }
}

const mapGraphqlCategories = (post: GraphqlPostNode): WordPressCategoryConnection => ({
  nodes:
    post.categories?.nodes
      ?.filter((cat): cat is GraphqlCategoryNode => Boolean(cat?.slug))
      .map(mapGraphqlCategoryNode) ?? [],
})

const mapGraphqlTags = (post: GraphqlPostNode): WordPressTagConnection => ({
  nodes:
    post.tags?.nodes
      ?.filter((tag): tag is GraphqlTagNode => Boolean(tag?.slug))
      .map(mapGraphqlTagNode) ?? [],
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
    uri: post.uri ?? undefined,
    link: post.link ?? undefined,
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
