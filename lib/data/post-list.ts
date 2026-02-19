import { decodeHtmlEntities } from "@/lib/utils/decodeHtmlEntities"
import { getArticleUrl, getCategoryUrl } from "@/lib/utils/routing"
import { sanitizeExcerpt } from "@/lib/utils/text/sanitizeExcerpt"
import type { WordPressCategory, WordPressPost } from "@/types/wp"

export interface PostListCategory {
  name: string
  slug: string
  href: string
}

export interface PostListAuthor {
  name: string
  slug?: string
}

export interface PostListItemData {
  id: string
  slug: string
  title: string
  excerpt: string
  href: string
  publishedAt?: string
  image?: {
    url?: string
    alt?: string
  }
  author?: PostListAuthor
  categories: PostListCategory[]
  countryCode: string
}

const buildStableFallbackId = (post: WordPressPost): string => {
  const relevantFields = [
    post.slug,
    (post as { link?: string }).link,
    post.title,
    post.date,
    post.modified,
  ].filter((value): value is string => typeof value === "string" && value.length > 0)

  if (relevantFields.length === 0) {
    return "legacy-post"
  }

  const fallbackSource = relevantFields.join("|")
  let hash = 0

  for (let index = 0; index < fallbackSource.length; index += 1) {
    const charCode = fallbackSource.charCodeAt(index)
    hash = (hash << 5) - hash + charCode
    hash |= 0
  }

  return `legacy-post-${Math.abs(hash)}`
}

const resolvePostId = (post: WordPressPost): string => {
  if (post.id) {
    return String(post.id)
  }

  if (post.databaseId) {
    return String(post.databaseId)
  }

  if (post.globalRelayId) {
    return String(post.globalRelayId)
  }

  if (post.slug) {
    return post.slug
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return buildStableFallbackId(post)
}

const mapCategories = (categories: WordPressCategory[] | undefined, countryCode: string): PostListCategory[] => {
  if (!categories || categories.length === 0) {
    return []
  }

  return categories
    .filter((category): category is WordPressCategory => Boolean(category?.slug && category?.name))
    .map((category) => ({
      name: decodeHtmlEntities(category.name ?? ""),
      slug: category.slug ?? "",
      href: getCategoryUrl(category.slug ?? "", countryCode),
    }))
}

export function mapWordPressPostToPostListItem(post: WordPressPost, countryCode: string): PostListItemData {
  const slug = post.slug ?? ""

  return {
    id: resolvePostId(post),
    slug,
    title: decodeHtmlEntities(post.title ?? ""),
    excerpt: sanitizeExcerpt(post.excerpt ?? ""),
    href: getArticleUrl(slug, countryCode),
    publishedAt: post.date ?? undefined,
    image: post.featuredImage?.node
      ? {
          url: post.featuredImage.node.sourceUrl ?? undefined,
          alt: post.featuredImage.node.altText ?? decodeHtmlEntities(post.title ?? ""),
        }
      : undefined,
    author: post.author?.node?.name
      ? {
          name: decodeHtmlEntities(post.author.node.name),
          slug: post.author.node.slug ?? undefined,
        }
      : undefined,
    categories: mapCategories(post.categories?.nodes as WordPressCategory[] | undefined, countryCode),
    countryCode,
  }
}

export function mapWordPressPostsToPostListItems(posts: WordPressPost[] | null | undefined, countryCode: string): PostListItemData[] {
  if (!posts || posts.length === 0) {
    return []
  }

  return posts.map((post) => mapWordPressPostToPostListItem(post, countryCode))
}
