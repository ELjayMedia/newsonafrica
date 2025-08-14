import {
  WordPressPost,
  WordPressCategory,
  WordPressPostSchema,
  WordPressPostType,
} from '@/lib/api/wordpress';

export function transformRestPostToGraphQL(post: any): WordPressPost {
  const transformed: WordPressPost = {
    id: post.id.toString(),
    title: post.title.rendered,
    content: post.content?.rendered,
    excerpt: post.excerpt.rendered,
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    featuredImage: post._embedded?.['wp:featuredmedia']?.[0]
      ? {
          node: {
            sourceUrl: post._embedded['wp:featuredmedia'][0].source_url,
            altText: post._embedded['wp:featuredmedia'][0].alt_text || '',
            title: post._embedded['wp:featuredmedia'][0].title?.rendered || undefined,
          },
        }
      : undefined,
    author: {
      node: {
        id: post._embedded?.author?.[0]?.id?.toString() || '0',
        name: post._embedded?.author?.[0]?.name || 'Unknown Author',
        slug: post._embedded?.author?.[0]?.slug || 'unknown-author',
        description: post._embedded?.author?.[0]?.description || '',
        avatar: {
          url: post._embedded?.author?.[0]?.avatar_urls?.['96'] || '',
        },
      },
    },
    categories: {
      nodes:
        post._embedded?.['wp:term']?.[0]?.map((cat: any) => ({
          id: cat.id.toString(),
          name: cat.name,
          slug: cat.slug,
        })) || [],
    },
    tags: {
      nodes:
        post._embedded?.['wp:term']?.[1]?.map((tag: any) => ({
          id: tag.id.toString(),
          name: tag.name,
          slug: tag.slug,
        })) || [],
    },
    seo: {
      title: post.yoast_title || post.title.rendered,
      metaDesc: post.yoast_meta?.description || post.excerpt.rendered.replace(/<[^>]*>/g, ''),
    },
    post_type: (post.post_type || 'news_article') as WordPressPostType,
    published_at: post.date,
    updated_at: post.modified,
    country: post.country || 'unknown',
    featured_image: post._embedded?.['wp:featuredmedia']?.[0]
      ? {
          node: {
            sourceUrl: post._embedded['wp:featuredmedia'][0].source_url,
            altText: post._embedded['wp:featuredmedia'][0].alt_text || '',
            title: post._embedded['wp:featuredmedia'][0].title?.rendered || undefined,
          },
        }
      : null,
    source_links: post.source_links || [],
  };

  return WordPressPostSchema.parse(transformed);
}

export function transformRestCategoryToGraphQL(category: any): WordPressCategory {
  return {
    id: category.id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    count: category.count,
  };
}
