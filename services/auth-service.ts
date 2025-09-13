import { supabase } from "@/lib/supabase"
import type { Provider } from "@supabase/supabase-js"

/**
 * Sign in a user with email and password.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * Register a new user with email and password. Optionally accepts a username
 * that will be stored in the user's metadata.
 */
export async function signUpWithEmail(email: string, password: string, username?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: username ? { data: { username } } : undefined,
  })
  if (error) throw error
  return data
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Trigger an OAuth sign in flow for a third party provider.
 */
export async function signInWithProvider(provider: Provider) {
  const origin = typeof window !== "undefined" ? window.location.origin : undefined
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: origin ? { redirectTo: `${origin}/auth/callback` } : undefined,
  })
  if (error) throw error
  return data
}

/**
 * Fetch the current auth session and user.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return { session: data.session, user: data.session?.user ?? null }
}
