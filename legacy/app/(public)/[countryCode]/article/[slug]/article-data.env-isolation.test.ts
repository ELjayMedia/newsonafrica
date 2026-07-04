import { describe, expect, it, vi } from "vitest";

import { buildArticleCountryPriority, resetArticleCountryPriorityCache } from "./article-data";

const withIsolatedArticleFallbackEnv = (callback: () => void): void => {
  vi.stubEnv("FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK", "");
  vi.stubEnv("ARTICLE_CROSS_POST_POLICY", "");
  vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "");
  vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "");
  vi.stubEnv("NEXT_PUBLIC_WP_ZA_GRAPHQL", "");
  resetArticleCountryPriorityCache();

  try {
    callback();
  } finally {
    vi.unstubAllEnvs();
    resetArticleCountryPriorityCache();
  }
};

describe("article fallback env isolation", () => {
  it("keeps the country fallback chain minimal when cross-country fallback env is disabled", () => {
    withIsolatedArticleFallbackEnv(() => {
      vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://newsonafrica.com/ng/graphql");
      vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "https://newsonafrica.com/sz/graphql");
      resetArticleCountryPriorityCache();

      expect(buildArticleCountryPriority("ng")).toEqual(["ng", "sz"]);
    });
  });

  it("keeps the african alias fallback chain minimal when cross-country fallback env is disabled", () => {
    withIsolatedArticleFallbackEnv(() => {
      vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "https://newsonafrica.com/sz/graphql");
      resetArticleCountryPriorityCache();

      expect(buildArticleCountryPriority("african")).toEqual(["sz"]);
    });
  });

  it("only includes all configured editions when the feature flag is explicitly enabled", () => {
    withIsolatedArticleFallbackEnv(() => {
      vi.stubEnv("FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK", "true");
      vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://newsonafrica.com/ng/graphql");
      vi.stubEnv("NEXT_PUBLIC_WP_SZ_GRAPHQL", "https://newsonafrica.com/sz/graphql");
      vi.stubEnv("NEXT_PUBLIC_WP_ZA_GRAPHQL", "https://newsonafrica.com/za/graphql");
      resetArticleCountryPriorityCache();

      expect(buildArticleCountryPriority("ng")).toEqual(["ng", "sz", "za"]);
    });
  });
});
