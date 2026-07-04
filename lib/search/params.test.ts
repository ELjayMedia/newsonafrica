import { describe, expect, it } from "vitest";

import {
  DEFAULT_SEARCH_PER_PAGE,
  DEFAULT_SUGGESTION_LIMIT,
  MAX_QUERY_LENGTH,
  MAX_SEARCH_PER_PAGE,
  MAX_SUGGESTION_LIMIT,
  buildSearchUrl,
  normalizeCountryFilter,
  normalizeSearchPage,
  normalizeSearchPerPage,
  normalizeSearchQuery,
  normalizeSuggestionLimit,
} from "@/lib/search/params";

describe("normalizeSearchQuery", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeSearchQuery("  eswatini   election\t\nresults  ")).toBe("eswatini election results");
  });

  it("returns an empty string for non-string input", () => {
    expect(normalizeSearchQuery(undefined)).toBe("");
    expect(normalizeSearchQuery(null)).toBe("");
    expect(normalizeSearchQuery(42)).toBe("");
    expect(normalizeSearchQuery(["a", "b"])).toBe("");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeSearchQuery("   \t\n ")).toBe("");
  });

  it("caps the query length and does not end in whitespace", () => {
    const long = `${"a".repeat(MAX_QUERY_LENGTH - 1)} bcdef`;
    const result = normalizeSearchQuery(long);
    expect(result.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
    expect(result).toBe(result.trim());
  });
});

describe("normalizeCountryFilter", () => {
  it("accepts supported country codes, case-insensitively", () => {
    expect(normalizeCountryFilter("sz")).toBe("sz");
    expect(normalizeCountryFilter(" ZA ")).toBe("za");
  });

  it("returns null for unsupported or non-string values", () => {
    expect(normalizeCountryFilter("us")).toBeNull();
    expect(normalizeCountryFilter("all")).toBeNull();
    expect(normalizeCountryFilter("")).toBeNull();
    expect(normalizeCountryFilter(undefined)).toBeNull();
    expect(normalizeCountryFilter(["za"])).toBeNull();
  });
});

describe("normalizeSearchPage", () => {
  it("parses valid pages from strings and numbers", () => {
    expect(normalizeSearchPage("3")).toBe(3);
    expect(normalizeSearchPage(7)).toBe(7);
    expect(normalizeSearchPage(2.9)).toBe(2);
  });

  it("falls back to 1 for invalid input", () => {
    expect(normalizeSearchPage(undefined)).toBe(1);
    expect(normalizeSearchPage("abc")).toBe(1);
    expect(normalizeSearchPage("-2")).toBe(1);
    expect(normalizeSearchPage(0)).toBe(1);
    expect(normalizeSearchPage(Number.NaN)).toBe(1);
  });
});

describe("normalizeSearchPerPage", () => {
  it("uses the default for invalid input", () => {
    expect(normalizeSearchPerPage(undefined)).toBe(DEFAULT_SEARCH_PER_PAGE);
    expect(normalizeSearchPerPage(0)).toBe(DEFAULT_SEARCH_PER_PAGE);
    expect(normalizeSearchPerPage("nope")).toBe(DEFAULT_SEARCH_PER_PAGE);
  });

  it("clamps to the maximum", () => {
    expect(normalizeSearchPerPage(9999)).toBe(MAX_SEARCH_PER_PAGE);
  });

  it("passes through valid values", () => {
    expect(normalizeSearchPerPage(24)).toBe(24);
    expect(normalizeSearchPerPage("6")).toBe(6);
  });
});

describe("normalizeSuggestionLimit", () => {
  it("uses the default for invalid input", () => {
    expect(normalizeSuggestionLimit(undefined)).toBe(DEFAULT_SUGGESTION_LIMIT);
    expect(normalizeSuggestionLimit(-1)).toBe(DEFAULT_SUGGESTION_LIMIT);
  });

  it("clamps to the maximum", () => {
    expect(normalizeSuggestionLimit(100)).toBe(MAX_SUGGESTION_LIMIT);
  });

  it("passes through valid values", () => {
    expect(normalizeSuggestionLimit(5)).toBe(5);
    expect(normalizeSuggestionLimit("3")).toBe(3);
  });
});

describe("buildSearchUrl", () => {
  it("builds a bare /search URL for an empty query", () => {
    expect(buildSearchUrl({ query: "" })).toBe("/search");
    expect(buildSearchUrl({ query: "   " })).toBe("/search");
  });

  it("encodes the query", () => {
    expect(buildSearchUrl({ query: "load shedding & tariffs" })).toBe("/search?q=load+shedding+%26+tariffs");
  });

  it("includes country and page only when meaningful", () => {
    expect(buildSearchUrl({ query: "mining", country: "za", page: 1 })).toBe("/search?q=mining&country=za");
    expect(buildSearchUrl({ query: "mining", country: "za", page: 3 })).toBe("/search?q=mining&country=za&page=3");
    expect(buildSearchUrl({ query: "mining", country: null, page: 2 })).toBe("/search?q=mining&page=2");
  });
});
