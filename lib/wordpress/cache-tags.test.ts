import { describe, expect, it } from "vitest";

import { cacheTags } from "@/lib/wordpress/cache-tags";

describe("cacheTags", () => {
  it("normalizes country-level scopes", () => {
    expect(cacheTags.country(" NG ")).toBe("country:ng");
    expect(cacheTags.home(undefined)).toBe("home:sz");
    expect(cacheTags.posts("")).toBe("country:sz:posts");
    expect(cacheTags.categories("ZA")).toBe("country:za:categories");
    expect(cacheTags.authors("ng")).toBe("country:ng:authors");
    expect(cacheTags.tags("sz")).toBe("country:sz:tags");
  });

  it("normalizes entity identifiers consistently", () => {
    expect(cacheTags.post("SZ", 42)).toBe("country:sz:post:42");
    expect(cacheTags.postSlug("sz", " Breaking-News ")).toBe(
      "country:sz:post-slug:breaking-news",
    );
    expect(cacheTags.category("ng", "Business")).toBe("country:ng:category:business");
    expect(cacheTags.author("za", "Staff Reporter")).toBe("country:za:author:staff reporter");
    expect(cacheTags.tag("sz", null)).toBe("country:sz:tag:unknown");
  });

  it("builds stable search tags", () => {
    expect(cacheTags.search("NG", " Africa Economy ")).toBe(
      "country:ng:search:africa economy",
    );
  });
});
