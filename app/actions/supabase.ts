"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import type { Session, SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "@/types/supabase"

import { ActionError, actionFailure, actionSuccess, type ActionResult } from "@/lib/supabase/action-result"
import { SUPABASE_CONFIGURATION_ERROR_MESSAGE } from "@/lib/supabase/server-component-client"
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

function createSupabaseServerClient(): SupabaseServerClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ActionError(SUPABASE_CONFIGURATION_ERROR_MESSAGE)
  }

  return createServerActionClient<Database>({ cookies }, {
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })
}

export async function withSupabaseSession<T>(
  callback: (context: { supabase: SupabaseServerClient; session: Session | null }) => Promise<T> | T,
): Promise<ActionResult<T>> {
  try {
    const supabase = createSupabaseServerClient()
    const session = await getSessionWithRefresh(supabase)
    const data = await callback({ supabase, session })
    return actionSuccess(data)
  } catch (error) {
    return actionFailure<T>(error)
  }
}

export async function getSupabaseSession(): Promise<ActionResult<Session | null>> {
  try {
    const supabase = createSupabaseServerClient()
    const session = await getSessionWithRefresh(supabase)
    return actionSuccess<Session | null>(session)
  } catch (error) {
    return actionFailure<Session | null>(error)
  }
}
