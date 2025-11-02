import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import ResetPasswordClient from "./ResetPasswordClient"

const { pushMock, updateUserMock, verifyOtpMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  updateUserMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      updateUser: updateUserMock,
      verifyOtp: verifyOtpMock,
    },
  },
}))

describe("ResetPasswordClient", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    pushMock.mockReset()
    updateUserMock.mockReset()
    verifyOtpMock.mockReset()
    updateUserMock.mockImplementation(async () => ({ error: null }))
    verifyOtpMock.mockImplementation(async () => ({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("navigates to /auth after a successful reset", async () => {
    render(<ResetPasswordClient resetKey="test-key" />)

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "password123" },
    })

    const submitButton = screen.getByRole("button", { name: /Reset Password/i })
    await act(async () => {
      fireEvent.submit(submitButton.closest("form") as HTMLFormElement)
      await Promise.resolve()
    })

    expect(updateUserMock).toHaveBeenCalledTimes(1)
    expect(updateUserMock).toHaveBeenCalledWith({ password: "password123" })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(pushMock).toHaveBeenCalledWith("/auth")
  })
})
