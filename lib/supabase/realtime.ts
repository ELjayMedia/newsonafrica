/**
 * Supabase Realtime utilities for safe channel subscription and cleanup.
 * Ensures proper cleanup to avoid "TooManyChannels" errors.
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

/**
 * Create and subscribe to a Supabase realtime channel.
 * Returns both the channel and an unsubscribe cleanup function.
 *
 * Usage in useEffect:
 * ```tsx
 * useEffect(() => {
 *   const { channel, unsubscribe } = createRealtimeSubscription(
 *     supabase,
 *     'my-channel',
 *     { event: '*', schema: 'public', table: 'my_table' },
 *     (payload) => console.log(payload)
 *   )
 *
 *   return unsubscribe
 * }, [])
 * ```
 */
export function createRealtimeSubscription(
  client: SupabaseClient<Database>,
  channelName: string,
  filter: {
    event: "*" | "INSERT" | "UPDATE" | "DELETE"
    schema: string
    table: string
    filter?: string
  },
  callback: (payload: any) => void,
): { channel: RealtimeChannel; unsubscribe: () => Promise<void> } {
  const channel = client
    .channel(channelName)
    .on("postgres_changes", filter as any, callback)
    .subscribe()

  const unsubscribe = async () => {
    await channel.unsubscribe()
  }

  return { channel, unsubscribe }
}

/**
 * Safe cleanup for a realtime channel subscription.
 * Handles both old (removeChannel) and new (unsubscribe) patterns.
 */
export async function cleanupRealtimeChannel(
  client: SupabaseClient<Database>,
  channel: RealtimeChannel,
): Promise<void> {
  try {
    // Modern approach: use channel.unsubscribe()
    if (channel && typeof channel.unsubscribe === "function") {
      await channel.unsubscribe()
    } else if (client && typeof client.removeChannel === "function") {
      // Fallback: use client.removeChannel (older pattern)
      await client.removeChannel(channel)
    }
  } catch (err) {
    console.error("[Realtime] Error cleaning up channel subscription:", err)
  }
}
