import React, { useEffect } from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BookmarksProvider, useBookmarks } from "./BookmarksContext"

const mocks = vi.hoisted(() => ({
  addBookmark: vi.fn(),
  bulkRemoveBookmarks: vi.fn(),
  exportBookmarks: vi.fn(),
  listBookmarks: vi.fn(),
  markRead: vi.fn(),
  markUnread: vi.fn(),
  removeBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  ensureSessionFreshness: vi.fn(),
  toast: vi.fn(),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}))

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: { id: "user-1" },
    ensureSessionFreshness: mocks.ensureSessionFreshness,
  }),
}))

vi.mock("@/app/actions/bookmarks", () => ({
  addBookmark: (...args: unknown[]) => mocks.addBookmark(...args),
  bulkRemoveBookmarks: (...args: unknown[]) => mocks.bulkRemoveBookmarks(...args),
  exportBookmarks: (...args: unknown[]) => mocks.exportBookmarks(...args),
  listBookmarks: (...args: unknown[]) => mocks.listBookmarks(...args),
  markRead: (...args: unknown[]) => mocks.markRead(...args),
  markUnread: (...args: unknown[]) => mocks.markUnread(...args),
  removeBookmark: (...args: unknown[]) => mocks.removeBookmark(...args),
  updateBookmark: (...args: unknown[]) => mocks.updateBookmark(...args),
}))

const originalFetch = global.fetch

const { addBookmark, listBookmarks, markRead, ensureSessionFreshness } = mocks

describe("BookmarksProvider optimistic updates", () => {
  beforeEach(() => {
    addBookmark.mockReset()
    listBookmarks.mockReset()
    markRead.mockReset()
    ensureSessionFreshness.mockReset()
    mocks.toast.mockReset()

    ensureSessionFreshness.mockResolvedValue(undefined)

    listBookmarks.mockResolvedValue({
      data: {
        bookmarks: [],
        stats: {
          total: 0,
          unread: 0,
          categories: {},
          readStates: {},
          collections: {},
        },
        pagination: { limit: 0, hasMore: false, nextCursor: null },
      },
      error: null,
    })

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ posts: {} }),
      }) as unknown as Promise<Response>,
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("merges server additions into optimistic state", async () => {
    const serverRow = {
      id: "bookmark-1",
      userId: "user-1",
      postId: "post-1",
      slug: "server-slug",
      editionCode: "sz",
      title: "Server Title",
      excerpt: "Server excerpt",
      featuredImage: null,
      category: "News",
      tags: ["tag"],
      readState: "unread" as const,
      note: null,
      createdAt: new Date().toISOString(),
    }

    addBookmark.mockResolvedValue({
      data: {
        added: [serverRow],
        statsDelta: {
          total: 1,
          unread: 1,
          categories: { News: 1 },
          readStates: { unread: 1 },
          collections: { __unassigned__: 1 },
        },
      },
      error: null,
    })

    const contextRef: { current: ReturnType<typeof useBookmarks> | null } = { current: null }
    let resolved = false

    function Capture() {
      const ctx = useBookmarks()
      useEffect(() => {
        contextRef.current = ctx
        if (!ctx.loading && !resolved) {
          resolved = true
        }
      }, [ctx])
      return null
    }

    render(
      <BookmarksProvider>
        <Capture />
      </BookmarksProvider>,
    )

    await waitFor(() => expect(resolved).toBe(true))
    const ctx = contextRef.current
    expect(ctx).not.toBeNull()

    await act(async () => {
      await ctx!.addBookmark({
        wp_post_id: "post-1",
        title: "Client Title",
        slug: "client-slug",
        excerpt: "Client excerpt",
        featuredImage: null,
        category: "News",
        tags: ["tag"],
        read_state: "unread",
        note: null,
        edition_code: "sz",
      })
    })

    await waitFor(() => expect(ctx!.bookmarks).toHaveLength(1))
    expect(ctx!.bookmarks[0].title).toBe("Server Title")
    expect(ctx!.stats.total).toBe(1)
    expect(ctx!.stats.unread).toBe(1)
    expect(ctx!.stats.categories).toEqual({ News: 1 })
  })

  it("honors server deltas for optimistic read toggles", async () => {
    const createdAt = new Date().toISOString()

    listBookmarks.mockResolvedValueOnce({
      data: {
        bookmarks: [
          {
            id: "bookmark-2",
            userId: "user-1",
            postId: "post-2",
            slug: "existing",
            editionCode: "sz",
            title: "Existing",
            excerpt: "Initial",
            featuredImage: null,
            category: "Tech",
            tags: null,
            readState: "unread",
            note: null,
            createdAt: createdAt,
          },
        ],
        stats: {
          total: 1,
          unread: 1,
          categories: { Tech: 1 },
          readStates: { unread: 1 },
          collections: { __unassigned__: 1 },
        },
        pagination: { limit: 1, hasMore: false, nextCursor: null },
      },
      error: null,
    })

    markRead.mockResolvedValue({
      data: {
        updated: [
          {
            id: "bookmark-2",
            userId: "user-1",
            postId: "post-2",
            slug: "existing",
            editionCode: "sz",
            title: "Existing",
            excerpt: "Initial",
            featuredImage: null,
            category: "Tech",
            tags: null,
            readState: "read" as const,
            note: null,
            createdAt: createdAt,
          },
        ],
        statsDelta: {
          total: 0,
          unread: -1,
          categories: {},
          readStates: { unread: -1, read: 1 },
          collections: { __unassigned__: -1 },
        },
      },
      error: null,
    })

    const contextRef: { current: ReturnType<typeof useBookmarks> | null } = { current: null }
    let resolved = false

    function Capture() {
      const ctx = useBookmarks()
      useEffect(() => {
        contextRef.current = ctx
        if (!ctx.loading && !resolved) {
          resolved = true
        }
      }, [ctx])
      return null
    }

    render(
      <BookmarksProvider>
        <Capture />
      </BookmarksProvider>,
    )

    await waitFor(() => expect(resolved).toBe(true))
    const ctx = contextRef.current
    expect(ctx).not.toBeNull()

    await act(async () => {
      await ctx!.markAsRead("post-2")
    })

    await waitFor(() => expect(ctx!.stats.unread).toBe(0))
    expect(ctx!.bookmarks[0].read_state).toBe("read")
  })
})
