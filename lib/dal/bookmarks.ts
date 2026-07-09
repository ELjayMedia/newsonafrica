/**
 * Bookmark data access (NOA-100). Uses the cookie-bound server client so
 * RLS scopes every query to the signed-in owner. Read failures degrade to
 * empty/false — the article page and saved-articles list render without
 * bookmark state rather than crashing when Supabase is unreachable.
 */
import "server-only";

import { getArticleUrl } from "@/lib/content-sync/article-url";
import { createLogger } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import type { BookmarkRow } from "@/lib/supabase/types";

const log = createLogger("dal:bookmarks");

/** A saved article hydrated against `content_index` (title etc. when indexed). */
export interface BookmarkedArticle {
  /** Bookmark row id (used for removal). */
  id: string;
  country: string;
  wpPostId: number;
  slug: string;
  savedAt: string;
  /** `/{country}/article/{slug}` — from the index when available, rebuilt from the snapshot otherwise. */
  url: string;
  /** Null when the article is not (yet) in the content index. */
  title: string | null;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null;
}

/** Whether the signed-in user has bookmarked the given article. */
export async function isBookmarked(country: string, wpPostId: number): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("country", country)
      .eq("wp_post_id", wpPostId)
      .maybeSingle();

    if (error) {
      log.warn("Failed to read bookmark state", { country, wpPostId, error: error.message });
      return false;
    }
    return data !== null;
  } catch (error) {
    log.warn("Bookmark state lookup skipped", { err: error });
    return false;
  }
}

/**
 * The signed-in user's saved articles, newest first, joined against
 * `content_index` for display metadata. Articles missing from the index
 * still appear, using the slug snapshot for the link.
 */
export async function listBookmarks(): Promise<BookmarkedArticle[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      log.warn("Failed to list bookmarks", { error: error.message });
      return [];
    }

    const bookmarks: BookmarkRow[] = data ?? [];
    if (bookmarks.length === 0) return [];

    // Hydrate titles/URLs from content_index, one query per country present
    // (articles are keyed by (country, wp_post_id), and wp post IDs are only
    // unique within a country's WordPress install).
    const byCountry = new Map<string, number[]>();
    for (const bookmark of bookmarks) {
      const ids = byCountry.get(bookmark.country) ?? [];
      ids.push(bookmark.wp_post_id);
      byCountry.set(bookmark.country, ids);
    }

    const indexRows = new Map<
      string,
      { title: string; excerpt: string | null; url_path: string; featured_image_url: string | null; published_at: string }
    >();

    await Promise.all(
      Array.from(byCountry.entries()).map(async ([country, wpPostIds]) => {
        const { data: rows, error: indexError } = await supabase
          .from("content_index")
          .select("wp_post_id, title, excerpt, url_path, featured_image_url, published_at")
          .eq("edition_code", country)
          .in("wp_post_id", wpPostIds);

        if (indexError) {
          log.warn("Failed to hydrate bookmarks", { country, error: indexError.message });
          return;
        }
        for (const row of rows ?? []) {
          indexRows.set(`${country}:${row.wp_post_id}`, row);
        }
      }),
    );

    return bookmarks.map((bookmark) => {
      const indexed = indexRows.get(`${bookmark.country}:${bookmark.wp_post_id}`);
      return {
        id: bookmark.id,
        country: bookmark.country,
        wpPostId: bookmark.wp_post_id,
        slug: bookmark.slug,
        savedAt: bookmark.created_at,
        url: indexed?.url_path ?? getArticleUrl(bookmark.country, bookmark.slug),
        title: indexed?.title ?? null,
        excerpt: indexed?.excerpt ?? null,
        featuredImageUrl: indexed?.featured_image_url ?? null,
        publishedAt: indexed?.published_at ?? null,
      };
    });
  } catch (error) {
    log.warn("Bookmark list skipped", { err: error });
    return [];
  }
}
