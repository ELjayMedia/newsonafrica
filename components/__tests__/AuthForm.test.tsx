import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthForm } from '../AuthForm'

// Mock Supabase client
const signInWithPassword = vi.fn()
const signInWithOAuth = vi.fn()
const signUp = vi.fn()
const resetPasswordForEmail = vi.fn()
const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
      signInWithOAuth,
      signUp,
      resetPasswordForEmail,
      onAuthStateChange,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

describe.skip('AuthForm error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows credentials error message', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })

    render(<AuthForm />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText('The email or password you entered is incorrect.')
      ).toBeInTheDocument()
    })
  })

  it('shows network error message', async () => {
    signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    render(<AuthForm />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Unable to connect to the authentication service.')
      ).toBeInTheDocument()
    })
  })

  it('shows validation error message', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: 'Password should be at least 6 characters' } })

    render(<AuthForm />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Your password is too short.')).toBeInTheDocument()
    })
  })

  it('shows rate limit error message', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: 'Too many requests' } })

    render(<AuthForm />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Too many login attempts.')).toBeInTheDocument()
    })
  })

  it('shows server error message', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: '500' } })

    render(<AuthForm />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Authentication service is currently unavailable.')
      ).toBeInTheDocument()
    })
  })
})
