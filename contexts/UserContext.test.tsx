import React, { useEffect } from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, beforeEach, vi } from "vitest"

import { UserProvider, useUser } from "./UserContext"

const mocks = vi.hoisted(() => ({
  mockSetSession: vi.fn(),
  mockClientSignOut: vi.fn(),
  mockGetCurrentSession: vi.fn(),
  mockSignOutAction: vi.fn(),
}))

vi.mock("@/lib/supabase/browser-helpers", () => ({
  isSupabaseConfigured: () => true,
  createClient: () => ({
    auth: {
      setSession: mocks.mockSetSession,
      signOut: mocks.mockClientSignOut,
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
        error: null,
      }),
    },
  }),
}))

vi.mock("@/app/actions/auth", () => ({
  getCurrentSession: mocks.mockGetCurrentSession,
  refreshSession: vi.fn(() => Promise.resolve({ data: null, error: null })),
  resetPassword: vi.fn(() => Promise.resolve({ data: null, error: null })),
  signIn: vi.fn(() => Promise.resolve({ data: null, error: null })),
  signInWithOAuth: vi.fn(() => Promise.resolve({ data: null, error: null })),
  signOut: mocks.mockSignOutAction,
  signUp: vi.fn(() => Promise.resolve({ data: null, error: null })),
  updateProfile: vi.fn(() => Promise.resolve({ data: null, error: null })),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}))

const { mockSetSession, mockClientSignOut, mockGetCurrentSession, mockSignOutAction } = mocks

function createSessionPayload() {
  const expiresInSeconds = 3600
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds

  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: expiresInSeconds,
    expires_at: expiresAt,
    token_type: "bearer",
  }
}

function SignOutOnMount() {
  const { signOut } = useUser()

  useEffect(() => {
    void signOut()
  }, [signOut])

  return null
}

describe("UserProvider", () => {
  beforeEach(() => {
    mockSetSession.mockReset()
    mockClientSignOut.mockReset()
    mockGetCurrentSession.mockReset()
    mockSignOutAction.mockReset()

    const sessionPayload = createSessionPayload()

    mockGetCurrentSession.mockResolvedValue({
      data: {
        session: sessionPayload,
        user: { id: "user-id" },
        profile: null,
      },
      error: null,
    })

    mockSignOutAction.mockResolvedValue({
      data: { success: true },
      error: null,
    })

    mockSetSession.mockResolvedValue({ data: null, error: null })
    mockClientSignOut.mockResolvedValue({ error: null })
  })

  it("synchronizes the Supabase browser client when a session is applied", async () => {
    const setSessionCall = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("setSession not called")), 1000)

      mockSetSession.mockImplementationOnce((params) => {
        clearTimeout(timeout)
        resolve()
        return Promise.resolve({ data: null, error: null })
      })
    })

    render(
      <UserProvider>
        <div>Child</div>
      </UserProvider>,
    )

    await setSessionCall
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
    })
  })

  it("clears the Supabase browser client on sign out", async () => {
    const signOutCall = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("signOut not called")), 1000)

      mockClientSignOut.mockImplementationOnce(() => {
        clearTimeout(timeout)
        resolve()
        return Promise.resolve({ error: null })
      })
    })

    render(
      <UserProvider>
        <SignOutOnMount />
      </UserProvider>,
    )

    await signOutCall
    expect(mockClientSignOut).toHaveBeenCalledTimes(1)
  })
})
