import {
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
  fetchFromWp,
  type WordPressPost,
} from './wordpress-api';
import { wordpressQueries } from './wordpress-queries';

export async function getPostsByCountry(
  countryIso: string,
  opts?: { category?: string; first?: number; after?: string }
) {
  const limit = opts?.first ?? 20;
  const restData = opts?.category
    ? await getPostsByCategoryForCountry(countryIso, opts.category, limit)
    : await getLatestPostsForCountry(countryIso, limit);
  const posts = (restData.posts || []).map(normalizeRestPost);
  return {
    nodes: posts,
    pageInfo: { endCursor: restData.endCursor, hasNextPage: restData.hasNextPage },
  };
}

export async function getPostBySlug(countryIso: string, slug: string) {
  const posts =
    (await fetchFromWp<WordPressPost[]>(
      countryIso,
      wordpressQueries.postBySlug(slug),
    )) || [];
  const post = posts[0];
  return post ? normalizeRestPost(post) : null;
}

function normalizeRestPost(post: WordPressPost) {
  return {
    id: Buffer.from(`post:${post.id}`).toString('base64'),
    slug: post.slug,
    date: post.date,
    title: post.title?.rendered ?? '',
    excerpt: post.excerpt?.rendered ?? '',
    content: post.content?.rendered,
    featuredImage: post.featuredImage
      ? { node: { sourceUrl: post.featuredImage.node.sourceUrl } }
      : null,
    categories: {
      nodes:
        post.categories?.nodes.map((c) => ({ name: c.name, slug: c.slug })) || [],
    },
    tags: {
      nodes: post.tags?.nodes.map((t) => ({ slug: t.slug })) || [],
    },
  };
}
