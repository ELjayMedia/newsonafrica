import React from 'react'
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthForm } from './AuthForm'

const signInWithPassword = vi.fn()
const signUp = vi.fn().mockResolvedValue({ data: null, error: null })
const resetPasswordForEmail = vi.fn()
const signInWithOAuth = vi.fn()
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
})

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
      signUp,
      resetPasswordForEmail,
      signInWithOAuth,
      onAuthStateChange,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}))

describe('AuthForm error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const submitSignIn = () => {
    render(<AuthForm />)
    fireEvent.change(
      screen.getByLabelText('Email', { selector: 'input#signin-email' }),
      { target: { value: 'test@example.com' } },
    )
    fireEvent.change(
      screen.getByLabelText('Password', { selector: 'input#signin-password' }),
      { target: { value: 'password123' } },
    )
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }))
  }

  it('shows credentials error message', async () => {
    signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', status: 400, name: 'AuthApiError' },
    })

    submitSignIn()

    await waitFor(() => {
      expect(
        screen.getByText('The email or password you entered is incorrect.')
      ).toBeInTheDocument()
    })
  })

  it('shows network error message', async () => {
    signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch', status: 0, name: 'AuthApiError' },
    })

    submitSignIn()

    await waitFor(() => {
      expect(
        screen.getByText('Unable to connect to the authentication service.')
      ).toBeInTheDocument()
    })
  })

  it('shows rate limit error message', async () => {
    signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Too many requests', status: 429, name: 'AuthApiError' },
    })

    submitSignIn()

    await waitFor(() => {
      expect(screen.getByText('Too many login attempts.')).toBeInTheDocument()
    })
  })

  it('shows server error message', async () => {
    signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: '500', status: 500, name: 'AuthApiError' },
    })

    submitSignIn()

    await waitFor(() => {
      expect(
        screen.getByText('Authentication service is currently unavailable.')
      ).toBeInTheDocument()
    })
  })

  it('shows unknown error message', async () => {
    signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Unexpected', status: 400, name: 'AuthApiError' },
    })

    submitSignIn()

    await waitFor(() => {
      expect(screen.getByText('Unexpected')).toBeInTheDocument()
    })
  })

  it('shows validation error message for password mismatch', async () => {
    render(<AuthForm defaultTab="signup" />)
    fireEvent.change(
      screen.getByLabelText('Email', { selector: 'input#signup-email' }),
      { target: { value: 'test@example.com' } },
    )
    fireEvent.change(
      screen.getByLabelText('Username', { selector: 'input#username' }),
      { target: { value: 'user' } },
    )
    fireEvent.change(
      screen.getByLabelText('Password', { selector: 'input#signup-password' }),
      { target: { value: 'password1' } },
    )
    fireEvent.change(
      screen.getByLabelText('Confirm Password', { selector: 'input#confirm-password' }),
      { target: { value: 'password2' } },
    )
    fireEvent.submit(screen.getByRole('button', { name: 'Sign Up' }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })
})
