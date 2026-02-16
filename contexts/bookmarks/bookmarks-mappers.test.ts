import type { BookmarkListRow } from "@/types/bookmarks"
import { describe, expect, it } from "vitest"
import { buildHydrationPayload, extractFeaturedImage, extractText, formatBookmarkRow } from "./bookmarks-mappers"

describe("bookmarks-mappers", () => {
  it("extractText handles rendered object values", () => {
    expect(extractText({ rendered: "Rendered title" })).toBe("Rendered title")
    expect(extractText("Plain")).toBe("Plain")
    expect(extractText(undefined)).toBe("")
  })

  it("extractFeaturedImage normalizes image shape", () => {
    expect(extractFeaturedImage({ source_url: "https://img", width: 120, height: 80 })).toEqual({
      url: "https://img",
      width: 120,
      height: 80,
    })
    expect(extractFeaturedImage("not-json")).toBeNull()
  })

  it("formatBookmarkRow falls back to hydration metadata", () => {
    const row: BookmarkListRow = {
      id: "b1",
      userId: "u1",
      postId: "p1",
      slug: null,
      editionCode: null,
      collectionId: null,
      title: "",
      excerpt: "",
      featuredImage: null,
      category: "News",
      tags: ["tag"],
      readState: "unread",
      note: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    }

    const bookmark = formatBookmarkRow(row, {
      id: "p1",
      country: "ZW",
      slug: "from-meta",
      title: { rendered: "Meta title" } as unknown as string,
      excerpt: "Meta excerpt",
      featuredImage: { source_url: "https://image" },
    })

    expect(bookmark.title).toBe("Meta title")
    expect(bookmark.slug).toBe("from-meta")
    expect(bookmark.editionCode).toBe("zw")
    expect(bookmark.postId).toBe("p1")
  })

  it("buildHydrationPayload groups unique ids by country", () => {
    const payload = buildHydrationPayload([
      { ...rowFixture, postId: "1", editionCode: "SZ" },
      { ...rowFixture, postId: "2", editionCode: "sz" },
      { ...rowFixture, postId: "3", editionCode: "ZW" },
      { ...rowFixture, postId: "2", editionCode: "sz" },
    ])

    expect(payload).toEqual([
      { country: "sz", postIds: ["1", "2"] },
      { country: "zw", postIds: ["3"] },
    ])
  })
})

const rowFixture: BookmarkListRow = {
  id: "fixture",
  userId: "user",
  postId: "fixture-post",
  slug: null,
  editionCode: null,
  collectionId: null,
  title: "",
  excerpt: "",
  featuredImage: null,
  category: null,
  tags: null,
  readState: null,
  note: null,
  createdAt: "2024-01-01T00:00:00.000Z",
}
