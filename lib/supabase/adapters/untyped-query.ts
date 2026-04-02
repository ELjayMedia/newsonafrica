/**
 * Adapter for running Supabase queries against tables/views not present
 * in the generated Database type.  All `as any` casts are isolated here
 * so the rest of the codebase stays lint-clean.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type Client = SupabaseClient<Database>

/**
 * Returns a Supabase query-builder for a table or view whose name is
 * not part of the generated `Database` type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untypedFrom(client: Client, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

/**
 * Variant that accepts an optional schema override (e.g. "auth").
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untypedFromSchema(client: Client, table: string, options?: { schema: string }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table, options)
}

/**
 * Call an untyped RPC function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untypedRpc(client: Client, fn: string, params?: Record<string, unknown>): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).rpc(fn, params)
}
