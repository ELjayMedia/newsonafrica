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

/** WordPress tag the newsroom uses to pick a section (category) lead story. */
export const SECTION_LEAD_TAG = "ft";

/**
 * Newest `ft`-tagged story in a category: the newsroom's pick to lead that
 * section page. Null when none is tagged (the page then leads with the newest).
 */
export async function getSectionLead(
  country: CountryCode | string,
  categorySlug: string,
): Promise<PostSummary | null> {
  try {
    const result = await listPosts({
      country,
      categorySlug,
      tagSlug: SECTION_LEAD_TAG,
      perPage: 1,
    });
    return result.items[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Front-page (`fp`) picks across several editions, newest first: what leads
 * the pan-African home. Each edition degrades independently.
 */
export async function getFrontPagePicks(
  countries: readonly string[],
  limit = FEATURED_FETCH,
): Promise<PostSummary[]> {
  const results = await Promise.allSettled(
    countries.map((country) => listPosts({ country, tagSlug: FEATURED_TAG, perPage: limit })),
  );
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value.items : []))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}

/** Put `picks` first, then `posts`, without repeating a story; cap at `total`. */
export function leadWith(picks: PostSummary[], posts: PostSummary[], total: number): PostSummary[] {
  const seen = new Set<string>();
  const out: PostSummary[] = [];
  for (const post of [...picks, ...posts]) {
    const key = `${post.country}:${post.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
    if (out.length >= total) break;
  }
  return out;
}
