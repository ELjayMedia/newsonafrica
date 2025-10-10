"use server"

import type { Session, SupabaseClient } from "@supabase/supabase-js"

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/supabase/action-result"
import { getSupabaseClient } from "@/lib/supabase/server-component-client"
import type { Database } from "@/types/supabase"

export type SupabaseServerClient = SupabaseClient<Database>

async function getSessionWithRefresh(supabase: SupabaseServerClient): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (session) {
    const expiresAt = session.expires_at ?? 0
    const expirationBufferInSeconds = 60
    const nowInSeconds = Math.floor(Date.now() / 1000)

    if (expiresAt > 0 && expiresAt <= nowInSeconds + expirationBufferInSeconds) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        throw refreshError
      }

      return refreshData.session
    }

    return session
  }

  if (error) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError) {
      throw refreshError
    }

    return refreshData.session
  }

  return null
}

export async function withSupabaseSession<T>(
  callback: (context: { supabase: SupabaseServerClient; session: Session | null }) => Promise<T> | T,
): Promise<ActionResult<T>> {
  const supabase = getSupabaseClient()

  try {
    const session = await getSessionWithRefresh(supabase)
    const data = await callback({ supabase, session })
    return actionSuccess(data)
  } catch (error) {
    return actionFailure<T>(error)
  }
}

export async function getSupabaseSession(): Promise<ActionResult<Session | null>> {
  const supabase = getSupabaseClient()

  try {
    const session = await getSessionWithRefresh(supabase)
    return actionSuccess<Session | null>(session)
  } catch (error) {
    return actionFailure<Session | null>(error)
  }
}
