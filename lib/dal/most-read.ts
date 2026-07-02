/**
 * Most-read rail (NOA-89), backed by the Supabase `most_read_content` RPC
 * over the `content_index` table (NOA-87). Unlike the WordPress-backed DAL
 * modules, this reads directly from Supabase (see docs/caching-strategy.md)
 * rather than through the Next.js fetch cache.
 */
import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import type { CountryCode } from "@/lib/wordpress/countries";
import type { MostReadPost } from "@/lib/dal/types";

const DEFAULT_LIMIT = 6;

/**
 * Fetch the most-read posts for a country edition. Resilient to Supabase
 * being unavailable/misconfigured — logs and returns an empty list rather
 * than failing the whole page, since the rail is a supplementary surface.
 */
export async function getMostReadPosts(
  country: CountryCode | string,
  limit: number = DEFAULT_LIMIT,
): Promise<MostReadPost[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("most_read_content", {
      country_filter: country,
      limit_count: limit,
    });

    if (error) {
      console.error("[most-read] Supabase RPC failed", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      wpPostId: row.wp_post_id,
      slug: row.slug,
      country: row.country as CountryCode,
      title: row.title,
      excerpt: row.excerpt ?? "",
      url: row.url_path,
      featuredImageUrl: row.featured_image_url,
      viewCount: row.view_count,
      publishedAt: row.published_at,
    }));
  } catch (error) {
    console.error("[most-read] Failed to fetch most-read posts", error);
    return [];
  }
}
