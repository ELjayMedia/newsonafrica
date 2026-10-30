import "server-only";

import { isValidCountry } from "@/lib/countries";
import { listCountries, listPostFeedSlice } from "@/lib/dal";
import type { PostSummary } from "@/lib/dal/types";
import {
  encodeFeedCursor,
  mergeEditionSlices,
  type EditionSlice,
  type FeedScope,
  type FeedState,
  type MultiFeedState,
} from "@/lib/feed/cursor";
import { createLogger } from "@/lib/log";

const log = createLogger("feed");

export interface FeedPage {
  posts: PostSummary[];
  /** Opaque cursor for the next page, or null when the feed is exhausted. */
  nextCursor: string | null;
}

/** Initial state for a scope: every edition (or the one edition) from its newest story. */
export function initialFeedState(scope: FeedScope): FeedState {
  if (scope.kind === "africa") {
    const editions: Record<string, string | null> = {};
    for (const country of listCountries()) editions[country.code] = null;
    return { v: 1, editions, done: [] };
  }
  return { v: 1, after: null };
}

/**
 * One page of an infinite feed. Single-edition scopes page by WPGraphQL
 * cursor; the pan-African scope fetches the next slice of every unfinished
 * edition and merges them newest-first (lib/feed/cursor.ts).
 */
export async function loadFeedPage(
  scope: FeedScope,
  state: FeedState,
  size: number,
): Promise<FeedPage> {
  if (scope.kind !== "africa") {
    const after = "after" in state ? state.after : null;
    const slice = await listPostFeedSlice({
      country: scope.country,
      categorySlug: scope.kind === "category" ? scope.slug : undefined,
      after,
      first: size,
    });
    const last = slice.entries[slice.entries.length - 1];
    return {
      posts: slice.entries.map((entry) => entry.post),
      nextCursor: slice.hasNextPage && last ? encodeFeedCursor({ v: 1, after: last.cursor }) : null,
    };
  }

  const multi = state as MultiFeedState;
  // Only real editions: a tampered cursor can't make us query unknown sites.
  const pending = Object.keys(multi.editions).filter(
    (code) => isValidCountry(code) && !multi.done.includes(code),
  );
  const slices: EditionSlice[] = await Promise.all(
    pending.map(async (country) => {
      try {
        const slice = await listPostFeedSlice({
          country,
          after: multi.editions[country],
          first: size,
        });
        return { country, ...slice };
      } catch (error) {
        // One edition being down must not empty the continental feed.
        log.warn("Edition feed slice unavailable", { country, err: error });
        return { country, entries: [], hasNextPage: false, failed: true };
      }
    }),
  );

  const { posts, next, hasMore } = mergeEditionSlices(slices, multi, size);
  return { posts, nextCursor: hasMore && posts.length > 0 ? encodeFeedCursor(next) : null };
}
