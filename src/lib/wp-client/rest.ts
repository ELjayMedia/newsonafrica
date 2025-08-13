import { jfetch } from '@/lib/http/fetcher';
import { env } from '@/config/env';

export const wp = {
  list: (country: string, category?: string, opts?: { revalidate?: number; tags?: string[] }) =>
    jfetch(`${env.WP_API_URL}/posts?country=${country}${category ? `&category=${category}` : ''}`, opts),
  article: (slug: string, opts?: { revalidate?: number; tags?: string[] }) =>
    jfetch(`${env.WP_API_URL}/posts?slug=${slug}`, opts).then(r => Array.isArray(r) ? r[0] : r),
};
