import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CommentItem } from "@/components/CommentItem"

const reportCommentMock = vi.fn()
const toastMock = vi.fn()

vi.mock("@/lib/comments/client", () => ({
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  reportComment: (...args: unknown[]) => reportCommentMock(...args),
}))

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: { id: "current-user" },
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

const baseComment = {
  id: "comment-1",
  wp_post_id: "post-1",
  edition_code: "ng",
  user_id: "other-user",
  body: "This is a comment",
  parent_id: null,
  created_at: new Date().toISOString(),
  status: "active" as const,
  is_rich_text: false,
  reactions_count: 0,
  replies_count: 0,
  reactions: [],
  profile: {
    username: "Another User",
    avatar_url: null,
  },
}

describe("CommentItem report flow", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const openReportDialog = () => {
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /report/i }))
  }

  it("submits a report successfully and clears dialog state on success", async () => {
    let resolveReport: (() => void) | undefined
    reportCommentMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReport = resolve
        }),
    )

    render(
      <CommentItem
        comment={baseComment}
        postId="post-1"
        editionCode="ng"
        onCommentUpdated={vi.fn()}
      />,
    )

    openReportDialog()
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "  abusive language  " },
    })

    const submitButton = screen.getByRole("button", { name: /submit report/i })
    fireEvent.click(submitButton)

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()

    resolveReport?.()

    await waitFor(() => {
      expect(reportCommentMock).toHaveBeenCalledWith({
        commentId: "comment-1",
        reportedBy: "current-user",
        reason: "abusive language",
      })
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Comment reported",
      }),
    )

    await waitFor(() => {
      expect(screen.queryByText(/please provide a reason for reporting this comment/i)).not.toBeInTheDocument()
    })
  })

  it("shows validation error when reason is empty", async () => {
    render(
      <CommentItem
        comment={baseComment}
        postId="post-1"
        editionCode="ng"
        onCommentUpdated={vi.fn()}
      />,
    )

    openReportDialog()
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }))

    expect(reportCommentMock).not.toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Report reason required",
        variant: "destructive",
      }),
    )
  })

  it("shows actionable error and keeps dialog state when backend submission fails", async () => {
    reportCommentMock.mockRejectedValue(new Error("Server unavailable"))

    render(
      <CommentItem
        comment={baseComment}
        postId="post-1"
        editionCode="ng"
        onCommentUpdated={vi.fn()}
      />,
    )

    openReportDialog()

    const reasonInput = screen.getByLabelText(/reason/i)
    fireEvent.change(reasonInput, { target: { value: "spam" } })
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Report failed",
          description: "Server unavailable. Please check your connection and try again.",
          variant: "destructive",
        }),
      )
    })

    expect(screen.getByLabelText(/reason/i)).toHaveValue("spam")
    expect(screen.getByText(/please provide a reason for reporting this comment/i)).toBeInTheDocument()
  })
})
