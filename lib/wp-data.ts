import { wpClient } from './wp-graphql';
import { PostsByCountryDocument, PostBySlugDocument } from '@/graphql/generated';
import {
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
  fetchFromWp,
  type WordPressPost,
} from './wordpress-api';
import { wordpressQueries } from './wordpress-queries';

const COUNTRY_SLUGS: Record<string, string> = {
  SZ: 'sz',
  ZA: 'za',
  DEFAULT: 'pan-africa',
};

function countrySlug(countryIso?: string) {
  const key = (countryIso || 'DEFAULT').toUpperCase();
  return COUNTRY_SLUGS[key] || COUNTRY_SLUGS.DEFAULT;
}

export async function getPostsByCountry(
  countryIso: string,
  opts?: { category?: string; first?: number; after?: string }
) {
  const client = wpClient(countryIso);
  const vars = {
    countrySlug: [countrySlug(countryIso)],
    category: opts?.category || null,
    first: opts?.first ?? 20,
    after: opts?.after ?? null,
  };
  try {
    const data = await client.request(PostsByCountryDocument, vars);
    return data.posts;
  } catch (error) {
    console.error('GraphQL getPostsByCountry failed, falling back to REST', error);
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
}

export async function getPostBySlugForCountry(countryIso: string, slug: string) {
  const client = wpClient(countryIso);
  try {
    const data = await client.request(PostBySlugDocument, { slug });
    return data.postBy;
  } catch (error) {
    console.error('GraphQL getPostBySlug failed, falling back to REST', error);
    const posts =
      (await fetchFromWp<WordPressPost[]>(
        countryIso,
        wordpressQueries.postBySlug(slug),
      )) || [];
    const post = posts[0];
    return post ? normalizeRestPost(post) : null;
  }
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
