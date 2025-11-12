import { describe, expect, it } from "vitest"

describe("TagPage", () => {
  it("exports incremental cache configuration", async () => {
    const pageModule = await import("./page")
    const tagsModule = await import("@/lib/wp-server/tags")

    expect(pageModule.dynamic).toBeUndefined()
    expect(pageModule.revalidate).toBe(tagsModule.TAG_PAGE_REVALIDATE)
  })
})
