import { jpost } from '@/lib/http/fetcher';
import { wpGraphqlBase } from './base';
import { tag } from '@/lib/cache/tags';

type Vars = Record<string, any>;

export async function gqlFetch<T>(country: string | undefined, query: string, variables?: Vars, revalidate = 300, tags?: string[]) {
  const url = wpGraphqlBase(country);
  return jpost<{ data: T }>(url, { query, variables }, { revalidate, tags }).then(r => r.data);
}

export const GQL = {
  async article(params: { country: string; slug: string; revalidate?: number }) {
    const { country, slug, revalidate = 300 } = params;
    const q = `
      query ArticleBySlug($slug: ID!) {
        post(id: $slug, idType: SLUG) {
          databaseId
          slug
          title
          date
          modified
          excerpt
          content
          featuredImage { node { sourceUrl altText mediaDetails { width height } } }
          author { node { name databaseId } }
          categories(first: 10) { nodes { databaseId slug name } }
        }
      }
    `;
    const data = await gqlFetch<{ post: any }>(country, q, { slug }, revalidate, [tag.article(slug)]);
    const p = data.post;
    if (!p) return null;
    return {
      id: p.databaseId,
      slug: p.slug,
      title: p.title?.replace(/<[^>]+>/g, ''),
      excerpt: p.excerpt?.replace(/<[^>]+>/g, ''),
      content: p.content,
      date: p.date,
      modified: p.modified,
      featured_image: p.featuredImage?.node
        ? {
            src: p.featuredImage.node.sourceUrl,
            alt: p.featuredImage.node.altText,
            width: p.featuredImage.node.mediaDetails?.width,
            height: p.featuredImage.node.mediaDetails?.height,
          }
        : undefined,
      author: p.author?.node ? { id: p.author.node.databaseId, name: p.author.node.name } : undefined,
      categories: p.categories?.nodes?.map((c: any) => c.databaseId) ?? [],
    };
  },

  async list(params: { country: string; categorySlug?: string; first?: number; after?: string | null; revalidate?: number }) {
    const { country, categorySlug, first = 20, after = null, revalidate = 300 } = params;
    const q = `
      query ListPosts($first: Int!, $after: String, $category: String) {
        posts(first: $first, after: $after, where: { categoryName: $category }) {
          pageInfo { hasNextPage endCursor }
          nodes {
            databaseId slug title date excerpt
            featuredImage { node { sourceUrl altText } }
            author { node { name databaseId } }
            categories(first: 10) { nodes { slug databaseId } }
          }
        }
      }
    `;
    const data = await gqlFetch<{ posts: any }>(
      country,
      q,
      { first, after, category: categorySlug || null },
      revalidate,
      [tag.list(country, categorySlug)]
    );
    return {
      pageInfo: data.posts.pageInfo,
      items: data.posts.nodes.map((n: any) => ({
        id: n.databaseId,
        slug: n.slug,
        title: n.title?.replace(/<[^>]+>/g, ''),
        excerpt: n.excerpt?.replace(/<[^>]+>/g, ''),
        date: n.date,
        featured_image: n.featuredImage?.node
          ? { src: n.featuredImage.node.sourceUrl, alt: n.featuredImage.node.altText }
          : undefined,
        author: n.author?.node ? { id: n.author.node.databaseId, name: n.author.node.name } : undefined,
        categories: n.categories?.nodes?.map((c: any) => c.databaseId) ?? [],
      })),
    };
  },
};
