/**
 * Most-read rail (NOA-89), backed by the Supabase `most_read_content` RPC
 * over the `content_index` table (NOA-87). Unlike the WordPress-backed DAL
 * modules, this reads directly from Supabase (see docs/caching-strategy.md)
 * rather than through the Next.js fetch cache.
 */
import "server-only";

import { createLogger } from "@/lib/log";
import { createPublicClient } from "@/lib/supabase/public";
import type { CountryCode } from "@/lib/wordpress/countries";
import type { MostReadPost } from "@/lib/dal/types";

const DEFAULT_LIMIT = 6;
const MAX_RPC_ATTEMPTS = 2;
const RETRY_DELAY_MS = 150;

const log = createLogger("most-read");

type RpcErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function isTransientRpcError(error: RpcErrorLike): boolean {
  if (error.code) return false;

  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /(fetch failed|timed? ?out|etimedout|econnreset|socket|terminated|abort)/.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch the most-read posts for a country edition. Resilient to Supabase
 * being unavailable/misconfigured — transient network failures are retried
 * once, then the rail is omitted rather than failing or stalling the page.
 */
export async function getMostReadPosts(
  country: CountryCode | string,
  limit: number = DEFAULT_LIMIT,
): Promise<MostReadPost[]> {
  try {
    const supabase = createPublicClient();

    for (let attempt = 1; attempt <= MAX_RPC_ATTEMPTS; attempt += 1) {
      const { data, error } = await supabase.rpc("most_read_content", {
        country_filter: country,
        limit_count: limit,
      });

      if (!error) {
        return (data ?? []).map((row) => ({
          id: row.id,
          wpPostId: row.wp_post_id,
          slug: row.slug,
          country: row.edition_code as CountryCode,
          title: row.title,
          excerpt: row.excerpt ?? "",
          url: row.url_path,
          featuredImageUrl: row.featured_image_url,
          publishedAt: row.published_at,
        }));
      }

      if (attempt < MAX_RPC_ATTEMPTS && isTransientRpcError(error)) {
        log.warn("Transient Supabase RPC failure; retrying", {
          country,
          attempt,
          error: error.message,
        });
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      log.error("Supabase RPC failed", { country, attempt, err: error });
      return [];
    }
  } catch (error) {
    log.error("Failed to fetch most-read posts", { country, err: error });
  }

  return [];
}
