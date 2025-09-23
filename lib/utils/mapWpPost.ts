import { rewriteLegacyLinks } from './routing'
import type { WordPressPost } from '../wordpress-api'

function decodeGlobalId(id: string): number {
  try {
    const decoded = Buffer.from(id, 'base64').toString('ascii')
    const parts = decoded.split(':')
    return Number(parts[parts.length - 1])
  } catch {
    return Number(id)
  }
}

export function mapWpPost(
  post: any,
  source: 'rest' | 'gql',
  countryCode?: string,
): WordPressPost {
  if (source === 'rest') {
    const featured = post._embedded?.['wp:featuredmedia']?.[0]
    const author = post._embedded?.['wp:author']?.[0]
    const categoryTerms = post._embedded?.['wp:term']?.[0] || []
    const tagTerms = post._embedded?.['wp:term']?.[1] || []

    return {
      ...post,
      content: post.content
        ? { rendered: rewriteLegacyLinks(post.content.rendered || '', countryCode) }
        : undefined,
      featuredImage: featured
        ? {
            node: {
              sourceUrl: featured.source_url,
              altText: featured.alt_text || '',
              mediaDetails: {
                width: featured.media_details?.width,
                height: featured.media_details?.height,
              },
            },
          }
        : undefined,
      author: author
        ? { node: { id: author.id, name: author.name, slug: author.slug } }
        : undefined,
      categories: {
        nodes: categoryTerms.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })),
      },
      tags: {
        nodes: tagTerms.map((tag: any) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })),
      },
    }
  }

  return {
    id: post.databaseId ?? decodeGlobalId(post.id),
    date: post.date,
    slug: post.slug,
    title: { rendered: post.title ?? '' },
    excerpt: { rendered: post.excerpt ?? '' },
    content: post.content
      ? { rendered: rewriteLegacyLinks(post.content, countryCode) }
      : undefined,
    featuredImage: post.featuredImage?.node
      ? {
          node: {
            sourceUrl: post.featuredImage.node.sourceUrl,
            altText: post.featuredImage.node.altText || '',
            mediaDetails: {
              width: post.featuredImage.node.mediaDetails?.width,
              height: post.featuredImage.node.mediaDetails?.height,
            },
          },
        }
      : undefined,
    author: post.author?.node
      ? {
          node: {
            id: post.author.node.databaseId ?? decodeGlobalId(post.author.node.id),
            name: post.author.node.name,
            slug: post.author.node.slug,
          },
        }
      : undefined,
    categories: {
      nodes:
        post.categories?.nodes.map((c: any) => ({
          id: c.databaseId ?? decodeGlobalId(c.id),
          name: c.name,
          slug: c.slug,
        })) || [],
    },
    tags: {
      nodes:
        post.tags?.nodes.map((t: any) => ({
          id: t.databaseId ?? decodeGlobalId(t.id),
          name: t.name,
          slug: t.slug,
        })) || [],
    },
  }
}
