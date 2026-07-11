import "server-only";

import { createLogger } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CountryCode } from "@/lib/countries";

const log = createLogger("search:log");

export interface SearchQueryLogEntry {
  query: string;
  country: CountryCode | null;
  resultCount: number;
}

/**
 * Records one executed search (NOA-137). Best-effort: any failure is swallowed
 * so logging never affects the search response. Intended to be scheduled via
 * `after()` from the search path so the write happens off the response's
 * critical path. Uses the service-role client — the table has no client
 * policies. `user_id` is intentionally omitted (search stays cookie-free).
 */
export async function logSearchQuery(entry: SearchQueryLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("search_query_log").insert({
      query: entry.query,
      edition_code: entry.country,
      result_count: entry.resultCount,
    });
    if (error) {
      log.warn("Search query log insert failed", { error: error.message });
    }
  } catch (error) {
    log.warn("Search query log threw", { error: error instanceof Error ? error.message : String(error) });
  }
}
