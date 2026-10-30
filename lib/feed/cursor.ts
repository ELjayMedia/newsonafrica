/**
 * Infinite-feed cursors and the multi-edition merge (pure; no server-only
 * imports so it is unit-testable). The cursor handed to the browser is an
 * opaque base64url JSON blob; the server validates it on every request.
 */
import type { PostSummary } from "@/lib/dal/types";

/** Stories per infinite-feed request. Fixed server-side; clients cannot raise it. */
export const FEED_PAGE_SIZE = 12;

export type FeedScope =
  | { kind: "africa" }
  | { kind: "edition"; country: string }
  | { kind: "category"; country: string; slug: string };

/** Resume point for a single-edition feed (`after: null` = from the newest story). */
export interface SingleFeedState {
  v: 1;
  after: string | null;
}

/** Resume point per edition for the pan-African feed, plus editions with nothing left. */
export interface MultiFeedState {
  v: 1;
  editions: Record<string, string | null>;
  done: string[];
}

export type FeedState = SingleFeedState | MultiFeedState;

export function encodeFeedCursor(state: FeedState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length <= 512);
}

/** Decode and validate a cursor for `scope`; returns null for anything malformed. */
export function decodeFeedCursor(cursor: string, scope: FeedScope): FeedState | null {
  if (cursor.length > 4096) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || (parsed as { v?: unknown }).v !== 1) return null;

  if (scope.kind === "africa") {
    const { editions, done } = parsed as Partial<MultiFeedState>;
    if (!editions || typeof editions !== "object" || Array.isArray(editions)) return null;
    if (!Object.values(editions).every(isNullableString)) return null;
    if (!Array.isArray(done) || !done.every((code) => typeof code === "string")) return null;
    return { v: 1, editions: { ...editions }, done: [...done] };
  }

  const { after } = parsed as Partial<SingleFeedState>;
  if (!isNullableString(after)) return null;
  return { v: 1, after: after ?? null };
}

export interface EditionSlice {
  country: string;
  entries: { post: PostSummary; cursor: string }[];
  hasNextPage: boolean;
  /** The fetch failed: keep this edition's cursor so it is retried next time. */
  failed?: boolean;
}

function publishedTime(post: PostSummary): number {
  const time = Date.parse(post.publishedAt);
  return Number.isFinite(time) ? time : 0;
}

/**
 * Merge per-edition slices (each newest-first) into one newest-first page of
 * `size` stories. Each edition's cursor advances only past the stories that
 * were actually shown, so nothing is skipped or repeated on the next page.
 */
export function mergeEditionSlices(
  slices: EditionSlice[],
  state: MultiFeedState,
  size: number,
): { posts: PostSummary[]; next: MultiFeedState; hasMore: boolean } {
  const candidates = slices.flatMap((slice) =>
    slice.entries.map((entry, index) => ({ ...entry, country: slice.country, index })),
  );
  candidates.sort(
    (a, b) =>
      publishedTime(b.post) - publishedTime(a.post) ||
      a.country.localeCompare(b.country) ||
      a.index - b.index,
  );
  const taken = candidates.slice(0, size);

  const editions = { ...state.editions };
  const done = new Set(state.done);
  for (const slice of slices) {
    const consumed = taken.filter((item) => item.country === slice.country);
    const last = consumed[consumed.length - 1];
    if (last) editions[slice.country] = last.cursor;
    if (!slice.failed && !slice.hasNextPage && consumed.length === slice.entries.length) {
      done.add(slice.country);
    }
  }

  const next: MultiFeedState = { v: 1, editions, done: [...done] };
  const hasMore = slices.some((slice) => !done.has(slice.country));
  return { posts: taken.map((item) => item.post), next, hasMore };
}
