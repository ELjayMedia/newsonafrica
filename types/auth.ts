import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

/**
 * Alias for the Supabase authentication error type.
 * Distinguishes Supabase errors from application-level AuthError.
 */
export type { SupabaseAuthError }
