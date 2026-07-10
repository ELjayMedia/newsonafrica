import { describe, expect, it } from "vitest";

import { normalizeWpPostId } from "@/lib/wordpress/wp-post-id";

describe("normalizeWpPostId", () => {
  it("passes through positive integers", () => {
    expect(normalizeWpPostId(1)).toBe(1);
    expect(normalizeWpPostId(3274)).toBe(3274);
    expect(normalizeWpPostId(2_147_483_648)).toBe(2_147_483_648); // beyond int32, valid bigint
  });

  it("parses numeric strings (the webhook JSON boundary)", () => {
    expect(normalizeWpPostId("1")).toBe(1);
    expect(normalizeWpPostId("3274")).toBe(3274);
    expect(normalizeWpPostId("  42  ")).toBe(42);
  });

  it("rejects non-numeric or partially-numeric strings", () => {
    expect(normalizeWpPostId("123abc")).toBeNull();
    expect(normalizeWpPostId("abc")).toBeNull();
    expect(normalizeWpPostId("")).toBeNull();
    expect(normalizeWpPostId("12.5")).toBeNull();
  });

  it("rejects zero, negatives and non-integers", () => {
    expect(normalizeWpPostId(0)).toBeNull();
    expect(normalizeWpPostId(-5)).toBeNull();
    expect(normalizeWpPostId(12.5)).toBeNull();
    expect(normalizeWpPostId(Number.NaN)).toBeNull();
  });

  it("rejects nullish and other types", () => {
    expect(normalizeWpPostId(undefined)).toBeNull();
    expect(normalizeWpPostId(null)).toBeNull();
    expect(normalizeWpPostId({})).toBeNull();
    expect(normalizeWpPostId(true)).toBeNull();
  });
});
