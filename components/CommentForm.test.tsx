import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CommentForm } from "@/components/CommentForm"
import * as commentService from "@/lib/comment-service"

const toastMock = vi.fn()

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: { id: "user-1", email: "user@example.com" },
    profile: { username: "user-1", avatar_url: null },
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

describe("CommentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders server cooldown state from retry metadata", async () => {
    vi.spyOn(commentService, "createOptimisticComment").mockReturnValue({ id: "optimistic-1", isOptimistic: true } as any)
    vi.spyOn(commentService, "addComment").mockRejectedValueOnce(
      new commentService.ApiRequestError("Rate limited. Please wait 3 seconds before commenting again.", 429, {
        rateLimit: { retryAfterSeconds: 3 },
      }),
    )

    render(<CommentForm postId="post-1" editionCode="ng" onCommentAdded={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Comment text"), { target: { value: "Hello world" } })
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }))

    await waitFor(() => {
      expect(screen.getByText("Rate limited. Please wait 3 seconds before commenting again.")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Post comment" })).toBeDisabled()
      expect(screen.getByText("Wait 3s")).toBeInTheDocument()
    })
  })
})
