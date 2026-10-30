import { describe, expect, it } from "vitest";

import {
  decodeFeedCursor,
  encodeFeedCursor,
  mergeEditionSlices,
  type EditionSlice,
  type MultiFeedState,
} from "@/lib/feed/cursor";
import type { PostSummary } from "@/lib/dal/types";

function post(country: string, id: number, day: number): PostSummary {
  return {
    id,
    slug: `${country}-${id}`,
    country: country as PostSummary["country"],
    title: `${country} ${id}`,
    excerpt: "",
    status: "publish",
    publishedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
    featuredImage: null,
    categories: [],
    tags: [],
    author: null,
  };
}

/** Newest-first slice for an edition, one post per day in `days`. */
function slice(country: string, days: number[], hasNextPage: boolean): EditionSlice {
  return {
    country,
    entries: days.map((day) => ({ post: post(country, day, day), cursor: `${country}:${day}` })),
    hasNextPage,
  };
}

const START: MultiFeedState = { v: 1, editions: { sz: null, za: null }, done: [] };

describe("feed cursor encoding", () => {
  it("round-trips single and multi-edition state", () => {
    const single = { v: 1 as const, after: "YXJyYXljb25uZWN0aW9uOjEw" };
    expect(decodeFeedCursor(encodeFeedCursor(single), { kind: "edition", country: "sz" })).toEqual(
      single,
    );
    expect(decodeFeedCursor(encodeFeedCursor(START), { kind: "africa" })).toEqual(START);
  });

  it("rejects malformed or mismatched cursors", () => {
    expect(decodeFeedCursor("not-base64-json", { kind: "africa" })).toBeNull();
    // A pan-African cursor replayed against an edition feed is rejected.
    expect(
      decodeFeedCursor(encodeFeedCursor(START), { kind: "edition", country: "sz" }),
    ).toBeNull();
    const wrongVersion = Buffer.from(JSON.stringify({ v: 2, after: null })).toString("base64url");
    expect(decodeFeedCursor(wrongVersion, { kind: "edition", country: "sz" })).toBeNull();
    const badEditions = Buffer.from(
      JSON.stringify({ v: 1, editions: { sz: 5 }, done: [] }),
    ).toString("base64url");
    expect(decodeFeedCursor(badEditions, { kind: "africa" })).toBeNull();
  });
});

describe("mergeEditionSlices", () => {
  it("interleaves editions newest-first and advances each cursor past what was shown", () => {
    const { posts, next, hasMore } = mergeEditionSlices(
      [slice("sz", [10, 8, 6, 4], true), slice("za", [9, 7, 5, 3], true)],
      START,
      4,
    );
    expect(posts.map((p) => p.slug)).toEqual(["sz-10", "za-9", "sz-8", "za-7"]);
    expect(next.editions).toEqual({ sz: "sz:8", za: "za:7" });
    expect(hasMore).toBe(true);
  });

  it("does not skip or repeat stories across consecutive pages", () => {
    const sz = [20, 18, 15, 11, 9, 4];
    const za = [19, 17, 16, 10, 3];
    const fetchAfter = (days: number[], country: string, cursor: string | null) => {
      const start = cursor ? days.indexOf(Number(cursor.split(":")[1])) + 1 : 0;
      const rest = days.slice(start, start + 3);
      return slice(country, rest, start + 3 < days.length);
    };

    let state: MultiFeedState = START;
    const seen: string[] = [];
    for (let page = 0; page < 6; page += 1) {
      const slices = (["sz", "za"] as const)
        .filter((code) => !state.done.includes(code))
        .map((code) => fetchAfter(code === "sz" ? sz : za, code, state.editions[code] ?? null));
      const result = mergeEditionSlices(slices, state, 3);
      seen.push(...result.posts.map((p) => p.slug));
      state = result.next;
      if (!result.hasMore) break;
    }

    const expected = [
      ...sz.map((d) => ({ s: `sz-${d}`, d })),
      ...za.map((d) => ({ s: `za-${d}`, d })),
    ]
      .sort((a, b) => b.d - a.d)
      .map((x) => x.s);
    expect(seen).toEqual(expected);
  });

  it("marks an edition done only when it is exhausted and fully shown", () => {
    const { next, hasMore } = mergeEditionSlices(
      [slice("sz", [5], false), slice("za", [9, 8], false)],
      START,
      2,
    );
    // za's two newer stories fill the page; sz-5 is still unshown, so sz is not done.
    expect(next.done).toEqual(["za"]);
    expect(hasMore).toBe(true);

    const final = mergeEditionSlices([slice("sz", [5], false)], next, 2);
    expect(final.posts.map((p) => p.slug)).toEqual(["sz-5"]);
    expect(final.hasMore).toBe(false);
  });

  it("keeps a failed edition's cursor so it is retried, not dropped", () => {
    const state: MultiFeedState = { v: 1, editions: { sz: "sz:10", za: "za:9" }, done: [] };
    const { next, hasMore } = mergeEditionSlices(
      [slice("sz", [8, 6], true), { country: "za", entries: [], hasNextPage: false, failed: true }],
      state,
      2,
    );
    expect(next.editions.za).toBe("za:9");
    expect(next.done).not.toContain("za");
    expect(hasMore).toBe(true);
  });
});
