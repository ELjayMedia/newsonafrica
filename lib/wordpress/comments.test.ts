import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchWordPressGraphQLMock = vi.fn()

vi.mock("./client", () => ({
  fetchWordPressGraphQL: (...args: unknown[]) => fetchWordPressGraphQLMock(...args),
}))

vi.mock("../log", () => ({
  error: vi.fn(),
}))

import { error as logError } from "../log"
import { fetchPendingComments, approveComment, deleteComment } from "./comments"
import { CACHE_DURATIONS } from "../cache/constants"

const errorMock = logError as unknown as ReturnType<typeof vi.fn>

const COMMENT_GLOBAL_ID_42 = Buffer.from("comment:42", "utf-8").toString("base64")

beforeEach(() => {
  fetchWordPressGraphQLMock.mockReset()
  errorMock.mockClear()
})

describe("fetchPendingComments", () => {
  it("maps GraphQL comment nodes to WordPress comments", async () => {
    fetchWordPressGraphQLMock.mockResolvedValue({
      ok: true,
      data: {
        comments: {
          nodes: [
            {
              databaseId: 42,
              content: "<p>Pending</p>",
              date: "2024-01-01T00:00:00Z",
              status: "HOLD",
              author: { node: { name: "Ada" } },
              commentedOn: { node: { databaseId: 5 } },
            },
          ],
        },
      },
    })

    const result = await fetchPendingComments("ng")

    expect(fetchWordPressGraphQLMock).toHaveBeenCalledWith(
      "ng",
      expect.stringContaining("PendingComments"),
      { first: 100 },
      {
        revalidate: CACHE_DURATIONS.NONE,
        tags: ["edition:ng"],
      },
    )
    expect(result).toEqual([
      {
        id: 42,
        author_name: "Ada",
        content: { rendered: "<p>Pending</p>" },
        date: "2024-01-01T00:00:00Z",
        status: "hold",
        post: 5,
      },
    ])
  })

  it("returns an empty list and logs when the query fails", async () => {
    const response = { ok: false, kind: "http_error", message: "failed" }
    fetchWordPressGraphQLMock.mockResolvedValue(response)

    const result = await fetchPendingComments("ng")

    expect(result).toEqual([])
    expect(errorMock).toHaveBeenCalledWith("[v0] Pending comments query failed", {
      countryCode: "ng",
      response,
    })
  })
})

describe("approveComment", () => {
  it("approves a comment and returns the mapped comment", async () => {
    fetchWordPressGraphQLMock.mockResolvedValue({
      ok: true,
      data: {
        updateComment: {
          comment: {
            databaseId: 42,
            content: "<p>Approved</p>",
            date: "2024-01-01T00:00:00Z",
            status: "APPROVE",
            author: { node: { name: "Ada" } },
            commentedOn: { node: { databaseId: 5 } },
          },
        },
      },
    })

    const result = await approveComment(42, "ng")

    expect(fetchWordPressGraphQLMock).toHaveBeenCalledWith(
      "ng",
      expect.stringContaining("ApproveComment"),
      { id: COMMENT_GLOBAL_ID_42 },
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    )
    expect(result).toEqual({
      id: 42,
      author_name: "Ada",
      content: { rendered: "<p>Approved</p>" },
      date: "2024-01-01T00:00:00Z",
      status: "approve",
      post: 5,
    })
  })

  it("throws an error when the mutation does not return a comment", async () => {
    fetchWordPressGraphQLMock.mockResolvedValue({ ok: true, data: { updateComment: { comment: null } } })

    await expect(approveComment(42, "ng")).rejects.toThrowError("Failed to approve comment 42")

    expect(errorMock).toHaveBeenNthCalledWith(1, "[v0] Approve comment mutation did not return comment", {
      countryCode: "ng",
      commentId: 42,
      response: { ok: true, data: { updateComment: { comment: null } } },
    })
  })

  it("throws when GraphQL mutation result is a failure envelope", async () => {
    const response = { ok: false, kind: "graphql_error", message: "nope" }
    fetchWordPressGraphQLMock.mockResolvedValue(response)

    await expect(approveComment(42, "ng")).rejects.toThrowError("Failed to approve comment 42")

    expect(errorMock).toHaveBeenCalledWith("[v0] Approve comment mutation failed", {
      countryCode: "ng",
      commentId: 42,
      response,
    })
  })
})

describe("deleteComment", () => {
  it("deletes a comment and returns the deleted comment", async () => {
    fetchWordPressGraphQLMock.mockResolvedValue({
      ok: true,
      data: {
        deleteComment: {
          deletedId: COMMENT_GLOBAL_ID_42,
          comment: {
            databaseId: 42,
            content: "<p>Pending</p>",
            date: "2024-01-01T00:00:00Z",
            status: "HOLD",
            author: { node: { name: "Ada" } },
            commentedOn: { node: { databaseId: 5 } },
          },
        },
      },
    })

    const result = await deleteComment(42, "ng")

    expect(fetchWordPressGraphQLMock).toHaveBeenCalledWith(
      "ng",
      expect.stringContaining("DeleteComment"),
      { id: COMMENT_GLOBAL_ID_42 },
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    )
    expect(result).toEqual({
      id: 42,
      author_name: "Ada",
      content: { rendered: "<p>Pending</p>" },
      date: "2024-01-01T00:00:00Z",
      status: "hold",
      post: 5,
    })
  })

  it("throws when the mutation response does not contain the deleted comment", async () => {
    const response = { ok: true, data: { deleteComment: { deletedId: COMMENT_GLOBAL_ID_42, comment: null } } }
    fetchWordPressGraphQLMock.mockResolvedValue(response)

    await expect(deleteComment(42, "ng")).rejects.toThrowError("Failed to delete comment 42")

    expect(errorMock).toHaveBeenNthCalledWith(1, "[v0] Delete comment mutation did not return comment", {
      countryCode: "ng",
      commentId: 42,
      response,
    })
  })

  it("throws when delete mutation returns a failure envelope", async () => {
    const response = { ok: false, kind: "http_error", message: "down" }
    fetchWordPressGraphQLMock.mockResolvedValue(response)

    await expect(deleteComment(42, "ng")).rejects.toThrowError("Failed to delete comment 42")

    expect(errorMock).toHaveBeenCalledWith("[v0] Delete comment mutation failed", {
      countryCode: "ng",
      commentId: 42,
      response,
    })
  })
})
