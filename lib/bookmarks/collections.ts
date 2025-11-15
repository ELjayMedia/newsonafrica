import type { SupabaseClient } from "@supabase/supabase-js"

import type { BookmarkCollectionRow } from "@/types/bookmarks"
import type { Database } from "@/types/supabase"

type BookmarkSupabaseClient = SupabaseClient<Database>

const DEFAULT_COLLECTION_SLUG = "general"
const DEFAULT_COLLECTION_NAME = "Saved Articles"
const DEFAULT_COLLECTION_DESCRIPTION = "Articles saved outside a specific edition"

function deriveSlug(editionCode?: string | null): string {
  if (editionCode && typeof editionCode === "string") {
    return editionCode.trim().toLowerCase()
  }
  return DEFAULT_COLLECTION_SLUG
}

function buildCollectionName(editionCode?: string | null): string {
  if (editionCode && typeof editionCode === "string" && editionCode.trim()) {
    return `${editionCode.trim().toUpperCase()} Edition`
  }
  return DEFAULT_COLLECTION_NAME
}

async function lookupCollectionById(
  client: BookmarkSupabaseClient,
  userId: string,
  collectionId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("bookmark_collections")
    .select("id")
    .eq("user_id", userId)
    .eq("id", collectionId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

async function lookupCollectionBySlug(
  client: BookmarkSupabaseClient,
  userId: string,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("bookmark_collections")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

function buildInsertPayload(
  userId: string,
  editionCode?: string | null,
): Pick<BookmarkCollectionRow, "user_id" | "name" | "slug" | "description" | "is_default" | "metadata"> {
  const slug = deriveSlug(editionCode)
  const isDefault = slug === DEFAULT_COLLECTION_SLUG

  return {
    user_id: userId,
    name: buildCollectionName(editionCode),
    slug,
    description: isDefault ? DEFAULT_COLLECTION_DESCRIPTION : null,
    is_default: isDefault,
    metadata: editionCode ? { edition_code: editionCode } : null,
  }
}

export async function ensureBookmarkCollectionAssignment(
  client: BookmarkSupabaseClient,
  options: { userId: string; collectionId?: string | null; editionCode?: string | null },
): Promise<string | null> {
  const { userId } = options
  if (!userId) {
    throw new Error("userId is required to resolve collection assignments")
  }

  if (options.collectionId) {
    const verifiedId = await lookupCollectionById(client, userId, options.collectionId)
    if (verifiedId) {
      return verifiedId
    }
  }

  const editionCode = options.editionCode ?? null
  const slug = deriveSlug(editionCode)
  const existingId = await lookupCollectionBySlug(client, userId, slug)

  if (existingId) {
    return existingId
  }

  const insertPayload = buildInsertPayload(userId, editionCode)
  const { data, error } = await client
    .from("bookmark_collections")
    .insert(insertPayload)
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return data?.id ?? null
}
