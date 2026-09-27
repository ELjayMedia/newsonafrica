import { describe, expect, it } from "vitest";

import { assessContentFreshness } from "@/lib/content-sync/freshness";

describe("assessContentFreshness", () => {
  it("reports fresh when source and index agree on the latest post", () => {
    expect(
      assessContentFreshness(
        { wpPostId: 42, publishedAt: "2026-09-27T08:00:00Z" },
        { wpPostId: 42, publishedAt: "2026-09-27T08:00:00Z" },
      ),
    ).toMatchObject({ status: "fresh" });
  });

  it("reports stale when WordPress has content but the index is empty", () => {
    expect(
      assessContentFreshness(
        { wpPostId: 42, publishedAt: "2026-09-27T08:00:00Z" },
        null,
      ),
    ).toMatchObject({ status: "stale" });
  });

  it("reports stale when the latest post identities differ", () => {
    expect(
      assessContentFreshness(
        { wpPostId: 43, publishedAt: "2026-09-27T09:00:00Z" },
        { wpPostId: 42, publishedAt: "2026-09-27T08:00:00Z" },
      ),
    ).toMatchObject({ status: "stale" });
  });

  it("reports empty when both source and index contain no posts", () => {
    expect(assessContentFreshness(null, null)).toEqual({
      status: "empty",
      reason: "Source and index contain no published posts.",
    });
  });

  it("does not claim freshness when WordPress cannot be checked", () => {
    expect(assessContentFreshness(null, null, "timeout")).toMatchObject({
      status: "source-unavailable",
    });
  });
});
