/**
 * Home-feed aggregation (NOA port of the legacy front-page logic). Assembles a
 * country edition's home feed from WordPress: posts tagged `fp` (the newsroom's
 * front-page curation tag) lead the feed (hero + top slots), then the latest
 * stories fill the rest, de-duplicated. This gives the newsroom hero control it
 * lacked when the page simply sliced the latest list. Degrades gracefully — a
 * failed featured or latest fetch just yields fewer stories rather than throwing.
 */
import "server-only";

import type { CountryCode } from "@/lib/wordpress/countries";
import { listPosts } from "@/lib/dal/posts";
import type { PostSummary } from "@/lib/dal/types";

export interface HomeFeed {
  /** Lead story (first sticky, else newest). */
  hero: PostSummary | null;
  /** Stories beside/under the hero. */
  secondary: PostSummary[];
  /** Remaining stories for the card grid. */
  grid: PostSummary[];
}

interface HomeFeedOptions {
  /** Total stories to assemble (hero + secondary + grid). */
  total?: number;
  /** How many secondary stories sit with the hero. */
  secondary?: number;
}

/** WordPress tag the newsroom uses to curate front-page (hero) stories. */
const FEATURED_TAG = "fp";
const FEATURED_FETCH = 5;

export async function getHomeFeed(
  country: CountryCode | string,
  { total = 13, secondary = 3 }: HomeFeedOptions = {},
): Promise<HomeFeed> {
  const [featuredResult, latestResult] = await Promise.allSettled([
    listPosts({ country, tagSlug: FEATURED_TAG, perPage: FEATURED_FETCH }),
    listPosts({ country, perPage: total + FEATURED_FETCH }),
  ]);

  const featured = featuredResult.status === "fulfilled" ? featuredResult.value.items : [];
  const latest = latestResult.status === "fulfilled" ? latestResult.value.items : [];

  const seen = new Set<number>();
  const ordered: PostSummary[] = [];
  for (const post of [...featured, ...latest]) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    ordered.push(post);
    if (ordered.length >= total) break;
  }

  const [hero, ...rest] = ordered;
  return {
    hero: hero ?? null,
    secondary: rest.slice(0, secondary),
    grid: rest.slice(secondary),
  };
}
