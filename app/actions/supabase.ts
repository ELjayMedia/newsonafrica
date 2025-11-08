"use server"

import type { Session, SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

import { actionFailure, actionSuccess, type ActionResult } from "@/lib/supabase/action-result"
import { createServerClient } from "@/utils/supabase/server"
export type SupabaseServerClient = SupabaseClient<Database>

export async function createSupabaseServerClient(): Promise<SupabaseServerClient> {
  return createServerClient()
}

export async function withSupabaseSession<T>(
  callback: (context: { supabase: SupabaseServerClient; session: Session | null }) => Promise<T> | T,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      throw error
    }

    const data = await callback({ supabase, session })
    return actionSuccess(data)
  } catch (error) {
    return actionFailure<T>(error)
  }
}

export async function getSupabaseSession(): Promise<ActionResult<Session | null>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      throw error
    }

    return actionSuccess<Session | null>(session)
  } catch (error) {
    return actionFailure<Session | null>(error)
  }
}
