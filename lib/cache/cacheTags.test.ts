import { describe, expect, it } from "vitest"

import { cacheTags } from "./cacheTags"

describe("cacheTags.postSlug", () => {
  it("formats post slug tags with normalized edition and slug", () => {
    expect(cacheTags.postSlug(" ZA ", "  My-Story ")).toBe("post-slug:za:my-story")
  })

  it("falls back to unknown for missing edition or slug", () => {
    expect(cacheTags.postSlug(undefined, null)).toBe("post-slug:unknown:unknown")
  })

  it("normalizes numeric slug values", () => {
    expect(cacheTags.postSlug("NG", 42)).toBe("post-slug:ng:42")
  })
})
