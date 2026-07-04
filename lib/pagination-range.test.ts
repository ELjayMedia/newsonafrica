import { describe, expect, it } from "vitest";

import { buildPageRange } from "@/lib/pagination-range";

describe("buildPageRange", () => {
  it("returns an empty array for zero/negative totals", () => {
    expect(buildPageRange(1, 0)).toEqual([]);
    expect(buildPageRange(1, -1)).toEqual([]);
  });

  it("returns every page when the total is small", () => {
    expect(buildPageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses pages far from the current page into a single ellipsis", () => {
    expect(buildPageRange(1, 20)).toEqual([1, 2, "…", 20]);
  });

  it("shows siblings on both sides of a middle page", () => {
    expect(buildPageRange(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
  });

  it("collapses only the leading ellipsis near the end", () => {
    expect(buildPageRange(19, 20)).toEqual([1, "…", 18, 19, 20]);
  });
});
