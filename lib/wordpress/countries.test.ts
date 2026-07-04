import { afterEach, describe, expect, it, vi } from "vitest";

import { getGraphQLEndpoint, getRestBase, isValidCountry, SUPPORTED_COUNTRY_CODES } from "@/lib/wordpress/countries";

describe("countries", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("validates supported country codes", () => {
    expect(isValidCountry("sz")).toBe(true);
    expect(isValidCountry("za")).toBe(true);
    expect(isValidCountry("ng")).toBe(true);
    expect(isValidCountry("us")).toBe(false);
  });

  it("lists exactly the supported codes", () => {
    expect(SUPPORTED_COUNTRY_CODES).toEqual(["sz", "za", "ng"]);
  });

  it("builds a REST base scoped to the country subpath", () => {
    expect(getRestBase("za")).toBe("https://cms.test.example/za/wp-json/wp/v2");
  });

  it("builds a GraphQL endpoint scoped to the country subpath", () => {
    expect(getGraphQLEndpoint("ng")).toBe("https://cms.test.example/ng/graphql");
  });

  it("uses explicit Nigeria endpoint overrides when configured", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_WP_NG_REST_BASE", "https://cms-ng.test.example/wp-json/wp/v2/");
    vi.stubEnv("NEXT_PUBLIC_WP_NG_GRAPHQL", "https://cms-ng.test.example/graphql/");

    const countries = await import("@/lib/wordpress/countries");

    expect(countries.getRestBase("ng")).toBe("https://cms-ng.test.example/wp-json/wp/v2");
    expect(countries.getGraphQLEndpoint("ng")).toBe("https://cms-ng.test.example/graphql");
  });

  it("does not apply Nigeria overrides to other country editions", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_WP_NG_REST_BASE", "https://cms-ng.test.example/wp-json/wp/v2");

    const countries = await import("@/lib/wordpress/countries");

    expect(countries.getRestBase("sz")).toBe("https://cms.test.example/sz/wp-json/wp/v2");
  });

  it("falls back to the default country for an unknown code", () => {
    expect(getRestBase("xx")).toBe("https://cms.test.example/sz/wp-json/wp/v2");
  });
});
