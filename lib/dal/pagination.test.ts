import { describe, expect, it } from "vitest";

import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";

describe("normalizePage", () => {
  it("defaults to 1 for missing/invalid input", () => {
    expect(normalizePage(undefined)).toBe(1);
    expect(normalizePage(0)).toBe(1);
    expect(normalizePage(-5)).toBe(1);
    expect(normalizePage(Number.NaN)).toBe(1);
  });

  it("floors fractional page numbers", () => {
    expect(normalizePage(3.9)).toBe(3);
  });
});

describe("normalizePerPage", () => {
  it("defaults to 10 for missing/invalid input", () => {
    expect(normalizePerPage(undefined)).toBe(10);
    expect(normalizePerPage(0)).toBe(10);
    expect(normalizePerPage(-1)).toBe(10);
  });

  it("clamps to the WordPress REST maximum of 100", () => {
    expect(normalizePerPage(500)).toBe(100);
  });
});

describe("buildPaginatedResult", () => {
  it("computes hasNextPage from total pages", () => {
    const result = buildPaginatedResult(["a", "b"], 1, 2, { total: 5, totalPages: 3 });
    expect(result).toEqual({ items: ["a", "b"], page: 1, perPage: 2, total: 5, totalPages: 3, hasNextPage: true });
  });

  it("reports no next page on the last page", () => {
    const result = buildPaginatedResult(["e"], 3, 2, { total: 5, totalPages: 3 });
    expect(result.hasNextPage).toBe(false);
  });

  it("derives totalPages when WordPress omits X-WP-TotalPages but total is known", () => {
    const result = buildPaginatedResult(["a"], 1, 10, { total: 25, totalPages: 0 });
    expect(result.totalPages).toBe(3);
  });

  it("treats an empty result with no total as zero pages", () => {
    const result = buildPaginatedResult([], 1, 10, { total: 0, totalPages: 0 });
    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
  });
});
