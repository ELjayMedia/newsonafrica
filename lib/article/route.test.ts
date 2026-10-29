import { describe, expect, it } from "vitest";

import { isArticlePath } from "@/lib/article/route";

describe("isArticlePath", () => {
  it("matches edition article URLs", () => {
    expect(isArticlePath("/sz/article/some-story")).toBe(true);
    expect(isArticlePath("/za/article/some-story/")).toBe(true);
  });

  it("does not match other routes", () => {
    expect(isArticlePath("/sz")).toBe(false);
    expect(isArticlePath("/sz/category/news")).toBe(false);
    expect(isArticlePath("/sz/article/some-story/opengraph-image")).toBe(false);
  });
});
