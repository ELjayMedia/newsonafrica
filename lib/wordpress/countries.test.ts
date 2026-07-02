import { describe, expect, it } from "vitest";

import { getGraphQLEndpoint, getRestBase, isValidCountry, SUPPORTED_COUNTRY_CODES } from "@/lib/wordpress/countries";

describe("countries", () => {
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

  it("falls back to the default country for an unknown code", () => {
    expect(getRestBase("xx")).toBe("https://cms.test.example/sz/wp-json/wp/v2");
  });
});
