import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from './useAuth'

const push = vi.fn()
const getMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/current',
  useSearchParams: () => ({ get: getMock }),
}))

const signIn = vi.fn()
const signUp = vi.fn()
const signOut = vi.fn()
const signInWithGoogle = vi.fn()
const signInWithFacebook = vi.fn()
const requireAuth = vi.fn()

vi.mock('@/contexts/UserContext', () => ({
  useUser: () => ({
    user: null,
    profile: null,
    loading: false,
    isAuthenticated: false,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
    requireAuth,
  }),
}))

describe('useAuth hook', () => {
  beforeEach(() => {
    push.mockReset()
    getMock.mockReset()
    signIn.mockReset()
    signUp.mockReset()
    signOut.mockReset()
  })

  it('login redirects to profile when no returnTo', async () => {
    getMock.mockReturnValue(null)
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('test@example.com', 'pass')
    })
    expect(signIn).toHaveBeenCalledWith('test@example.com', 'pass', false)
    expect(push).toHaveBeenCalledWith('/profile')
  })

  it('register respects returnTo query param', async () => {
    getMock.mockReturnValue('/welcome')
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.register('a@b.com', 'pass', 'user')
    })
    expect(signUp).toHaveBeenCalledWith('a@b.com', 'pass', 'user')
    expect(push).toHaveBeenCalledWith('/welcome')
  })

  it('logout calls signOut with redirect', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.logout()
    })
    expect(signOut).toHaveBeenCalledWith('/auth')
  })
})
