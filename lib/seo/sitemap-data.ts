/**
 * Data fetchers for the sitemap routes (NOA-112/113).
 *
 * Articles come from the Supabase `content_index` (NOA-87) via the
 * cookie-free public client — listing tens of thousands of URLs there is a
 * single cheap indexed query, versus paginating the WordPress REST API.
 * Category/tag/author slugs still come from the WordPress DAL (they aren't
 * indexed in Supabase).
 *
 * Resilience convention (same as `lib/dal/most-read.ts` and `lib/search`):
 * every fetcher catches, logs and returns an empty list/zero so a CMS or
 * Supabase outage produces an empty sitemap instead of a 500/build crash.
 */
import "server-only";

import { listAuthors, listCategories, listTags } from "@/lib/dal";
import type { PaginatedResult } from "@/lib/dal/types";
import { createPublicClient } from "@/lib/supabase/public";
import { NEWS_SITEMAP_MAX_URLS, NEWS_SITEMAP_WINDOW_MS } from "@/lib/seo/sitemap-xml";

/** Max `<url>` entries per article sitemap page (spec allows 50k; keep responses small). */
export const ARTICLES_PER_SITEMAP = 1000;

/** Safety cap on term listing (pages of 100) so a runaway taxonomy can't stall the route. */
const MAX_TERM_PAGES = 10;
const TERMS_PER_PAGE = 100;

export interface SitemapArticle {
  /** Site-relative path (e.g. "/sz/article/some-slug"). */
  path: string;
  publishedAt: string;
  updatedAt: string | null;
}

/** One page of published articles for a country, newest first. Empty on failure. */
export async function listSitemapArticles(country: string, page: number): Promise<SitemapArticle[]> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const from = (safePage - 1) * ARTICLES_PER_SITEMAP;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("content_index")
      .select("url_path, published_at, updated_at")
      .eq("edition_code", country)
      .order("published_at", { ascending: false })
      .range(from, from + ARTICLES_PER_SITEMAP - 1);

    if (error) {
      console.error(`[sitemap] content_index query failed for ${country}`, error);
      return [];
    }

    return (data ?? []).map((row) => ({
      path: row.url_path,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error(`[sitemap] failed to list articles for ${country}`, error);
    return [];
  }
}

/** Count of published articles for a country (sizes the sitemap index). 0 on failure. */
export async function countSitemapArticles(country: string): Promise<number> {
  try {
    const supabase = createPublicClient();
    const { count, error } = await supabase
      .from("content_index")
      .select("id", { count: "exact", head: true })
      .eq("edition_code", country);

    if (error) {
      console.error(`[sitemap] content_index count failed for ${country}`, error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error(`[sitemap] failed to count articles for ${country}`, error);
    return 0;
  }
}

export interface NewsSitemapArticle {
  /** Site-relative path. */
  path: string;
  title: string;
  publishedAt: string;
  /** Category names, used for `<news:keywords>`. */
  categories: string[];
}

/**
 * Published articles from the last 48 hours for a country (Google News
 * window, NOA-113), newest first, capped at the spec's 1,000 URLs.
 */
export async function listRecentNewsArticles(
  country: string,
  now: Date = new Date(),
): Promise<NewsSitemapArticle[]> {
  const cutoff = new Date(now.getTime() - NEWS_SITEMAP_WINDOW_MS).toISOString();

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("content_index")
      .select("url_path, title, published_at, categories")
      .eq("edition_code", country)
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(NEWS_SITEMAP_MAX_URLS);

    if (error) {
      console.error(`[news-sitemap] content_index query failed for ${country}`, error);
      return [];
    }

    return (data ?? []).map((row) => ({
      path: row.url_path,
      title: row.title,
      publishedAt: row.published_at,
      categories: row.categories ?? [],
    }));
  } catch (error) {
    console.error(`[news-sitemap] failed to list recent articles for ${country}`, error);
    return [];
  }
}

/** Drain a paginated DAL listing (up to MAX_TERM_PAGES pages). Empty on failure. */
async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>,
  label: string,
): Promise<T[]> {
  const all: T[] = [];
  try {
    for (let page = 1; page <= MAX_TERM_PAGES; page += 1) {
      const result = await fetchPage(page);
      all.push(...result.items);
      if (!result.hasNextPage || result.items.length === 0) break;
    }
    return all;
  } catch (error) {
    console.error(`[sitemap] failed to list ${label}`, error);
    return [];
  }
}

export function listSitemapCategorySlugs(country: string): Promise<string[]> {
  return collectAllPages(
    (page) => listCategories({ country, page, perPage: TERMS_PER_PAGE }),
    `categories for ${country}`,
  ).then((items) => items.map((item) => item.slug));
}

export function listSitemapTagSlugs(country: string): Promise<string[]> {
  return collectAllPages(
    (page) => listTags({ country, page, perPage: TERMS_PER_PAGE }),
    `tags for ${country}`,
  ).then((items) => items.map((item) => item.slug));
}

export function listSitemapAuthorSlugs(country: string): Promise<string[]> {
  return collectAllPages(
    (page) => listAuthors({ country, page, perPage: TERMS_PER_PAGE }),
    `authors for ${country}`,
  ).then((items) => items.map((item) => item.slug));
}
