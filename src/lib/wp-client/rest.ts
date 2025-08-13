import { jfetch } from '@/lib/http/fetcher';
import { wpRestBase } from './base';
import { tag } from '@/lib/cache/tags';
import type { WPCategory } from './types';
import { Article } from '@/features/articles/schema';
import { cleanHtml } from '@/features/articles/clean';
import { validateArticle } from '@/features/articles/constraints';

const cacheCats = new Map<string, WPCategory[]>(); // process memory memo

async function categories(country: string, revalidate = 3600): Promise<WPCategory[]> {
  const base = wpRestBase(country);
  if (cacheCats.has(country)) return cacheCats.get(country)!;
  const data = await jfetch<WPCategory[]>(`${base}/categories?per_page=100`, {
    revalidate,
    tags: [tag.categories(country)],
  });
  cacheCats.set(country, data);
  return data;
}

async function categoryIdBySlug(country: string, slug: string): Promise<number | null> {
  const cats = await categories(country);
  return cats.find(c => c.slug === slug)?.id ?? null;
}

function mapEmbedded(country: string, post: any): Article {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const img = media
    ? {
        src: media.source_url,
        alt: media.alt_text,
        width: media.media_details?.width,
        height: media.media_details?.height,
      }
    : undefined;
  const article: Article = {
    id: post.id,
    slug: post.slug,
    country,
    categorySlugs:
      post._embedded?.['wp:term']?.[0]?.map((c: any) => c.slug) ?? post.categories ?? [],
    title: (post.title?.rendered ?? '').replace(/<[^>]+>/g, ''),
    excerpt: (post.excerpt?.rendered ?? '').replace(/<[^>]+>/g, ''),
    html: cleanHtml(post.content?.rendered || ''),
    authorName: post._embedded?.author?.[0]?.name,
    authorId: post._embedded?.author?.[0]?.id,
    publishedAt: post.date,
    updatedAt: post.modified,
    image: img,
  };
  validateArticle(article);
  return article;
}

export const WPR = {
  async list(params: {
    country: string;
    categorySlug?: string;
    page?: number;
    perPage?: number;
    revalidate?: number;
  }) {
    const { country, categorySlug, page = 1, perPage = 20, revalidate = 300 } = params;
    const base = wpRestBase(country);
    const u = new URL(`${base}/posts`);
    u.searchParams.set('page', String(page));
    u.searchParams.set('per_page', String(perPage));
    u.searchParams.set('_embed', 'true');
    if (categorySlug) {
      const cid = await categoryIdBySlug(country, categorySlug);
      if (cid) u.searchParams.set('categories', String(cid));
    }
    const raw = await jfetch<any[]>(u.toString(), {
      revalidate,
      tags: [tag.list(country, categorySlug)],
    });
    return raw.map(p => mapEmbedded(country, p));
  },

  async article(params: { country: string; slug: string; revalidate?: number }) {
    const { country, slug, revalidate = 300 } = params;
    const base = wpRestBase(country);
    const u = new URL(`${base}/posts`);
    u.searchParams.set('slug', slug);
    u.searchParams.set('_embed', 'true');
    const raw = await jfetch<any[]>(u.toString(), {
      revalidate,
      tags: [tag.article(slug)],
    });
    return raw?.[0] ? mapEmbedded(country, raw[0]) : null;
  },

  async latest(params: { country: string; limit?: number; revalidate?: number }) {
    const { country, limit = 10, revalidate = 120 } = params;
    const base = wpRestBase(country);
    const u = new URL(`${base}/posts`);
    u.searchParams.set('per_page', String(limit));
    u.searchParams.set('_embed', 'true');
    const raw = await jfetch<any[]>(u.toString(), {
      revalidate,
      tags: [tag.list(country)],
    });
    return raw.map(p => mapEmbedded(country, p));
  },

  async related(params: { country: string; slug: string; revalidate?: number; limit?: number }) {
    const { country, slug, revalidate = 300, limit = 5 } = params;
    const article = await WPR.article({ country, slug, revalidate });
    if (!article?.categorySlugs?.length) return [] as Article[];
    const base = wpRestBase(country);
    const u = new URL(`${base}/posts`);
    u.searchParams.set('per_page', String(limit));
    u.searchParams.set('_embed', 'true');
    const firstCat = article.categorySlugs[0];
    if (firstCat) {
      const cid = await categoryIdBySlug(country, firstCat);
      if (cid) u.searchParams.set('categories', String(cid));
    }
    u.searchParams.set('exclude', String(article.id));
    const raw = await jfetch<any[]>(u.toString(), {
      revalidate,
      tags: [tag.list(country)],
    });
    return raw.map(p => mapEmbedded(country, p));
  },
};
