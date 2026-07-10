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

/** Pull a usable image URL out of the bookmark's snapshotted `featured_image` jsonb. */
function featuredImageUrl(featuredImage: Record<string, unknown> | null): string | null {
  if (!featuredImage) return null;
  for (const key of ["url", "source_url", "sourceUrl", "src"]) {
    const value = featuredImage[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

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
      .eq("edition_code", country)
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

    // Hydrate titles/URLs from content_index when the article is indexed, one
    // query per edition present (articles are keyed by (edition_code,
    // wp_post_id), and wp post IDs are only unique within an edition's install).
    // The bookmark row also snapshots this metadata, used as the fallback.
    const byCountry = new Map<string, number[]>();
    for (const bookmark of bookmarks) {
      const ids = byCountry.get(bookmark.edition_code) ?? [];
      ids.push(bookmark.wp_post_id);
      byCountry.set(bookmark.edition_code, ids);
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
      const indexed = indexRows.get(`${bookmark.edition_code}:${bookmark.wp_post_id}`);
      const slug = bookmark.slug ?? "";
      return {
        id: bookmark.id,
        country: bookmark.edition_code,
        wpPostId: bookmark.wp_post_id,
        slug,
        savedAt: bookmark.created_at,
        // Prefer the live index for a fresh URL/title; fall back to the
        // snapshot the bookmark row carries (content_index may not have the
        // article, e.g. before/while the backfill runs).
        url: indexed?.url_path ?? (slug ? getArticleUrl(bookmark.edition_code, slug) : `/${bookmark.edition_code}`),
        title: indexed?.title ?? bookmark.title ?? null,
        excerpt: indexed?.excerpt ?? bookmark.excerpt ?? null,
        featuredImageUrl: indexed?.featured_image_url ?? featuredImageUrl(bookmark.featured_image),
        publishedAt: indexed?.published_at ?? null,
      };
    });
  } catch (error) {
    log.warn("Bookmark list skipped", { err: error });
    return [];
  }
}
