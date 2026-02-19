import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

const DEFAULT_VIEW_CANDIDATES: Record<string, readonly string[]> = {
  bookmarks: ["bookmarks_view", "bookmark_list_view", "bookmarks_list_view"],
  comments: ["comments_view", "comment_list_view", "comments_list_view"],
  subscriptions: ["subscriptions_view", "subscription_list_view", "subscriptions_list_view"],
}

type Client = SupabaseClient<Database>
type QueryBuilder = ReturnType<Client["from"]>

type ResponseWithError<TData = unknown> = {
  data?: TData
  error?: PostgrestError | null
}

const RELATION_MISSING_CODES = new Set(["42P01", "42P07", "42704"]) // undefined_table, duplicate_table, undefined_object

function isRelationMissing(error: PostgrestError | null | undefined): boolean {
  if (!error) {
    return false
  }

  if (error.code && RELATION_MISSING_CODES.has(error.code)) {
    return true
  }

  const detail = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase()
  return detail.includes("does not exist") || detail.includes("unknown table") || detail.includes("unknown relation")
}

function readEnvironmentCandidates(table: string): string[] {
  const envKeys = [
    `SUPABASE_VIEW_${table.toUpperCase()}`,
    `NEXT_PUBLIC_SUPABASE_VIEW_${table.toUpperCase()}`,
  ]

  const values = envKeys
    .map((key) => process.env[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

  return values
}

function getListViewCandidates(table: string): string[] {
  const envCandidates = readEnvironmentCandidates(table)
  const defaultCandidates = DEFAULT_VIEW_CANDIDATES[table] ?? []
  const unique = new Set<string>()

  for (const candidate of [...envCandidates, ...defaultCandidates]) {
    if (candidate && candidate.trim().length > 0) {
      unique.add(candidate)
    }
  }

  return [...unique]
}

export async function executeListQuery<TResponse extends ResponseWithError>(
  client: Client,
  table: keyof Database["public"]["Tables"] & string,
  factory: (builder: QueryBuilder) => Promise<TResponse>,
): Promise<TResponse> {
  const untypedClient = client as any
  const candidates = getListViewCandidates(table)

  for (const relation of candidates) {
    const result = await factory(untypedClient.from(relation) as QueryBuilder)
    const error = result.error ?? null
    if (!isRelationMissing(error)) {
      return result
    }
  }

  return factory(untypedClient.from(table) as QueryBuilder)
}

export function resolveListSource(
  table: keyof Database["public"]["Tables"] & string,
): string | null {
  const [firstCandidate] = getListViewCandidates(table)
  return firstCandidate ?? null
}
