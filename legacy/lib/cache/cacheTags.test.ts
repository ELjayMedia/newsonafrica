import { describe, expect, it } from "vitest"

import { cacheTags } from "./cacheTags"

describe("cacheTags", () => {
  it("builds canonical post-related tags", () => {
    expect(cacheTags.post(" ZA ", 42)).toBe("edition:za:post:42")
    expect(cacheTags.postSlug(" ZA ", "  My-Story ")).toBe("edition:za:post-slug:my-story")
  })

  it("builds canonical taxonomy tags", () => {
    expect(cacheTags.category("NG", "Politics")).toBe("edition:ng:category:politics")
    expect(cacheTags.tag("NG", "Breaking")).toBe("edition:ng:tag:breaking")
    expect(cacheTags.author("NG", "Jane-Doe")).toBe("edition:ng:author:jane-doe")
  })

  it("falls back to african edition for missing edition", () => {
    expect(cacheTags.home(undefined)).toBe("home:african-edition")
    expect(cacheTags.edition(null)).toBe("edition:african-edition")
  })


  it("emits exact canonical namespace strings", () => {
    expect(cacheTags.edition("ng")).toBe("edition:ng")
    expect(cacheTags.home("all")).toBe("home:all")
    expect(cacheTags.post("ng", "77")).toBe("edition:ng:post:77")
    expect(cacheTags.postSlug("ng", "my-story")).toBe("edition:ng:post-slug:my-story")
    expect(cacheTags.category("ng", "politics")).toBe("edition:ng:category:politics")
    expect(cacheTags.tag("ng", "breaking")).toBe("edition:ng:tag:breaking")
  })
})
