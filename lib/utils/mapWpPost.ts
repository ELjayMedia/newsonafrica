import { rewriteLegacyLinks } from './routing'
import type { WordPressPost } from '../wordpress/client'
import type { HomePostFieldsFragment, PostFieldsFragment } from '@/types/wpgraphql'

function decodeGlobalId(id: string): number {
  try {
    const decoded = Buffer.from(id, 'base64').toString('ascii')
    const parts = decoded.split(':')
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
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string
      alt_text?: string
      media_details?: { width?: number; height?: number }
    }>
    'wp:author'?: Array<{ id?: number; name?: string; slug?: string }>
    'wp:term'?: Array<Array<{ id?: number; databaseId?: number; name?: string; slug?: string }>>
  }
}

const extractRendered = (value: string | { rendered?: string } | undefined): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value.rendered) return value.rendered
  return undefined
}

type GraphqlPostNode = PostFieldsFragment | HomePostFieldsFragment

const resolveRelayId = (post: RestPost | GraphqlPostNode): string | undefined => {
  const candidate = (post as any)?.globalRelayId ?? (post as any)?.id
  if (typeof candidate === 'string' && candidate.length > 0) {
    return candidate
  }
  return undefined
}

const mapRestPost = (post: RestPost, countryCode?: string): WordPressPost => {
  const featured = post._embedded?.['wp:featuredmedia']?.[0]
  const author = post._embedded?.['wp:author']?.[0]
  const categoryTerms = post._embedded?.['wp:term']?.[0] ?? []
  const tagTerms = post._embedded?.['wp:term']?.[1] ?? []

  const content = extractRendered(post.content)

  return {
    __typename: 'Post',
    databaseId: post.databaseId ?? post.id ?? undefined,
    id: post.id !== undefined ? String(post.id) : undefined,
    slug: post.slug ?? undefined,
    date: post.date ?? undefined,
    title: extractRendered(post.title) ?? '',
    excerpt: extractRendered(post.excerpt) ?? '',
    content: content ? rewriteLegacyLinks(content, countryCode) : undefined,
    featuredImage: featured
      ? {
          __typename: 'NodeWithFeaturedImageToMediaItemConnectionEdge',
          node: {
            __typename: 'MediaItem',
            sourceUrl: featured.source_url ?? undefined,
            altText: featured.alt_text ?? undefined,
            mediaDetails: featured.media_details
              ? {
                  __typename: 'MediaDetails',
                  width: featured.media_details.width ?? undefined,
                  height: featured.media_details.height ?? undefined,
                }
              : undefined,
          },
        }
      : undefined,
    author: author
      ? {
          __typename: 'NodeWithAuthorToUserConnectionEdge',
          node: {
            __typename: 'User',
            databaseId: author.id ?? undefined,
            name: author.name ?? undefined,
            slug: author.slug ?? undefined,
          },
        }
      : undefined,
    categories: {
      __typename: 'PostToCategoryConnection',
      nodes: categoryTerms
        .filter((cat): cat is NonNullable<typeof cat> => Boolean(cat))
        .map((cat) => ({
          __typename: 'Category',
          databaseId: cat.databaseId ?? cat.id ?? undefined,
          name: cat.name ?? undefined,
          slug: cat.slug ?? undefined,
        })),
    },
    tags: {
      __typename: 'PostToTagConnection',
      nodes: tagTerms
        .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
        .map((tag) => ({
          __typename: 'Tag',
          databaseId: tag.databaseId ?? tag.id ?? undefined,
          name: tag.name ?? undefined,
          slug: tag.slug ?? undefined,
        })),
    },
    globalRelayId: resolveRelayId(post),
  }
}

export function mapWpPost(
  post: RestPost | GraphqlPostNode,
  source: 'rest' | 'gql',
  countryCode?: string,
): WordPressPost {
  if (source === 'rest') {
    return mapRestPost(post as RestPost, countryCode)
  }

  const gqlPost = post as GraphqlPostNode
  const content = gqlPost.content ? rewriteLegacyLinks(gqlPost.content, countryCode) : undefined

  return {
    __typename: gqlPost.__typename ?? 'Post',
    databaseId: gqlPost.databaseId ?? undefined,
    id: gqlPost.id ?? undefined,
    slug: gqlPost.slug ?? undefined,
    date: gqlPost.date ?? undefined,
    title: gqlPost.title ?? '',
    excerpt: gqlPost.excerpt ?? '',
    content,
    featuredImage: gqlPost.featuredImage
      ? {
          __typename: gqlPost.featuredImage.__typename ?? 'NodeWithFeaturedImageToMediaItemConnectionEdge',
          node: gqlPost.featuredImage.node
            ? {
                __typename: gqlPost.featuredImage.node.__typename ?? 'MediaItem',
                sourceUrl: gqlPost.featuredImage.node.sourceUrl ?? undefined,
                altText: gqlPost.featuredImage.node.altText ?? undefined,
                mediaDetails: gqlPost.featuredImage.node.mediaDetails
                  ? {
                      __typename: gqlPost.featuredImage.node.mediaDetails.__typename ?? 'MediaDetails',
                      width: gqlPost.featuredImage.node.mediaDetails.width ?? undefined,
                      height: gqlPost.featuredImage.node.mediaDetails.height ?? undefined,
                    }
                  : undefined,
              }
            : undefined,
        }
      : undefined,
    author: gqlPost.author
      ? {
          __typename: gqlPost.author.__typename ?? 'NodeWithAuthorToUserConnectionEdge',
          node: gqlPost.author.node
            ? {
                __typename: gqlPost.author.node.__typename ?? 'User',
                databaseId: gqlPost.author.node.databaseId ?? undefined,
                name: gqlPost.author.node.name ?? undefined,
                slug: gqlPost.author.node.slug ?? undefined,
              }
            : undefined,
        }
      : undefined,
    categories: gqlPost.categories
      ? {
          __typename: gqlPost.categories.__typename ?? 'PostToCategoryConnection',
          nodes:
            gqlPost.categories.nodes
              ?.filter((cat): cat is NonNullable<typeof cat> => Boolean(cat))
              .map((cat) => ({
                __typename: cat.__typename ?? 'Category',
                databaseId: cat.databaseId ?? undefined,
                name: cat.name ?? undefined,
                slug: cat.slug ?? undefined,
              })) ?? [],
        }
      : { __typename: 'PostToCategoryConnection', nodes: [] },
    tags: gqlPost.tags
      ? {
          __typename: gqlPost.tags.__typename ?? 'PostToTagConnection',
          nodes:
            gqlPost.tags.nodes
              ?.filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
              .map((tag) => ({
                __typename: tag.__typename ?? 'Tag',
                databaseId: tag.databaseId ?? undefined,
                name: tag.name ?? undefined,
                slug: tag.slug ?? undefined,
              })) ?? [],
        }
      : { __typename: 'PostToTagConnection', nodes: [] },
    globalRelayId: resolveRelayId(gqlPost),
  }
}
