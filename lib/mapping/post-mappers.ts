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
import type { WordPressRestPost, WordPressRestTerm } from "@/lib/wordpress/post-rest"

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
// REST shapes → normalize
// ------------------------------

const first = <T>(values?: Array<T | null | undefined>): T | undefined => {
  if (!values?.length) {
    return undefined
  }

  for (const value of values) {
    if (value) {
      return value
    }
  }

  return undefined
}

const selectAvatarUrl = (
  avatarUrls?: Record<string, string | undefined>,
): string | undefined => {
  if (!avatarUrls) {
    return undefined
  }

  const preferredSizes = ["512", "256", "128", "96", "64", "48", "32", "24"]

  for (const size of preferredSizes) {
    const candidate = avatarUrls[size]
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate
    }
  }

  for (const value of Object.values(avatarUrls)) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  return undefined
}

const mapRestAuthor = (post: WordPressRestPost): WordPressAuthor | undefined => {
  const rawAuthor = first(post._embedded?.author)

  if (!rawAuthor) {
    return undefined
  }

  const databaseId = typeof rawAuthor.id === "number" ? rawAuthor.id : undefined
  const name = typeof rawAuthor.name === "string" ? rawAuthor.name : ""
  const slug = typeof rawAuthor.slug === "string" ? rawAuthor.slug : ""
  const description = typeof rawAuthor.description === "string" ? rawAuthor.description : undefined
  const avatarUrl = selectAvatarUrl(rawAuthor.avatar_urls)
  const avatar = avatarUrl ? { url: avatarUrl } : undefined

  return {
    id: databaseId,
    databaseId,
    name,
    slug,
    description,
    avatar,
    node: {
      id: databaseId,
      databaseId,
      name,
      slug,
      description,
      avatar,
    },
  }
}

const mapRestFeaturedImage = (post: WordPressRestPost): WordPressMedia | undefined => {
  const rawMedia = first(post._embedded?.["wp:featuredmedia"])

  if (!rawMedia) {
    return undefined
  }

  const caption =
    typeof rawMedia.caption === "string"
      ? rawMedia.caption
      : typeof rawMedia.caption?.rendered === "string"
        ? rawMedia.caption.rendered
        : undefined

  const mediaDetails =
    rawMedia.media_details && typeof rawMedia.media_details === "object"
      ? {
          width:
            typeof rawMedia.media_details.width === "number"
              ? rawMedia.media_details.width
              : undefined,
          height:
            typeof rawMedia.media_details.height === "number"
              ? rawMedia.media_details.height
              : undefined,
        }
      : undefined

  return {
    node: {
      sourceUrl: typeof rawMedia.source_url === "string" ? rawMedia.source_url : undefined,
      altText: typeof rawMedia.alt_text === "string" ? rawMedia.alt_text : undefined,
      caption,
      mediaDetails,
    },
  }
}

const flattenRestTerms = (post: WordPressRestPost): WordPressRestTerm[] => {
  const groups = post._embedded?.["wp:term"] ?? []
  const flattened: WordPressRestTerm[] = []

  for (const group of groups) {
    if (!Array.isArray(group)) {
      continue
    }

    for (const term of group) {
      if (term && typeof term === "object") {
        flattened.push(term)
      }
    }
  }

  return flattened
}

const mapRestCategories = (post: WordPressRestPost): WordPressCategoryConnection => {
  const terms = flattenRestTerms(post)
  const categories = terms.filter((term) => term.taxonomy === "category")

  return {
    nodes: categories.map((term) => ({
      databaseId: typeof term.id === "number" ? term.id : undefined,
      id: typeof term.id === "number" ? term.id : undefined,
      name: term.name ?? undefined,
      slug: term.slug ?? undefined,
      description: term.description ?? undefined,
      count: typeof term.count === "number" ? term.count : undefined,
    })),
  }
}

const mapRestTags = (post: WordPressRestPost): WordPressTagConnection => {
  const terms = flattenRestTerms(post)
  const tags = terms.filter((term) => term.taxonomy === "post_tag" || term.taxonomy === "tag")

  return {
    nodes: tags.map((term) => ({
      databaseId: typeof term.id === "number" ? term.id : undefined,
      id: typeof term.id === "number" ? term.id : undefined,
      name: term.name ?? undefined,
      slug: term.slug ?? undefined,
    })),
  }
}

const resolveRestUri = (link?: string | null): string | undefined => {
  if (typeof link !== "string" || link.length === 0) {
    return undefined
  }

  try {
    const url = new URL(link)
    return url.pathname || undefined
  } catch {
    return undefined
  }
}

export const mapRestPostToWordPressPost = (
  post: WordPressRestPost,
  countryCode?: string,
): WordPressPost => {
  const databaseId = typeof post.id === "number" ? post.id : undefined
  const content =
    typeof post.content?.rendered === "string"
      ? rewriteLegacyLinks(post.content.rendered, countryCode)
      : undefined

  return {
    databaseId,
    id: databaseId != null ? String(databaseId) : undefined,
    slug: post.slug ?? undefined,
    date: post.date ?? undefined,
    modified: post.modified ?? undefined,
    title: post.title?.rendered ?? "",
    excerpt: post.excerpt?.rendered ?? "",
    content,
    uri: resolveRestUri(post.link),
    link: post.link ?? undefined,
    author: mapRestAuthor(post),
    featuredImage: mapRestFeaturedImage(post),
    categories: mapRestCategories(post),
    tags: mapRestTags(post),
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
