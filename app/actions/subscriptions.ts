"use server"

import { withSupabaseSession } from "@/app/actions/supabase"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import type { Database } from "@/types/supabase"
import { executeListQuery } from "@/lib/supabase/list-query"

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]

function toSerializable<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export async function getUserSubscriptions(userId: string): Promise<ActionResult<SubscriptionRow[]>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    if (session.user.id !== userId) {
      throw new ActionError("You do not have access to these subscriptions", { status: 403 })
    }

    const { data, error } = await executeListQuery(supabase, "subscriptions", (query) =>
      query.select<SubscriptionRow>("*").eq("user_id", userId).order("created_at", { ascending: false }),
    )

    if (error) {
      throw new ActionError("Failed to load subscriptions", { cause: error })
    }

    return toSerializable(data ?? [])
  })
}

interface RecordSubscriptionInput {
  userId: string
  plan: string
  status: SubscriptionRow["status"]
  renewalDate: string | null
  paymentId: string
  paymentProvider?: SubscriptionRow["payment_provider"]
  metadata?: SubscriptionInsert["metadata"]
  startDate?: string
  endDate?: string | null
}

export async function recordSubscription(input: RecordSubscriptionInput): Promise<ActionResult<SubscriptionRow>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    if (session.user.id !== input.userId) {
      throw new ActionError("You do not have access to record this subscription", { status: 403 })
    }

    const nowIso = new Date().toISOString()
    const payload: SubscriptionInsert = {
      id: input.paymentId,
      user_id: input.userId,
      plan: input.plan,
      status: input.status,
      start_date: input.startDate ?? nowIso,
      end_date: input.endDate ?? null,
      renewal_date: input.renewalDate,
      payment_provider: input.paymentProvider ?? "paystack",
      payment_id: input.paymentId,
      metadata: input.metadata ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(payload, { onConflict: "id" })
      .select<SubscriptionRow>("*")
      .single()

    if (error || !data) {
      throw new ActionError("Failed to record subscription", { cause: error })
    }

    revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)

    return toSerializable(data)
  })
}
