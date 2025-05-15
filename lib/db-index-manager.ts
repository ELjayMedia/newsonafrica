import { createAdminClient } from "@/lib/supabase"

/**
 * Database index information
 */
interface IndexInfo {
  table: string
  name: string
  columns: string[]
  unique: boolean
  exists: boolean
}

/**
 * Check if an index exists
 */
export async function checkIndexExists(table: string, indexName: string): Promise<boolean> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient.rpc("check_index_exists", {
    p_table: table,
    p_index: indexName,
  })

  if (error) {
    console.error("Error checking index:", error)
    return false
  }

  return !!data
}

/**
 * Create an index if it doesn't exist
 */
export async function createIndexIfNotExists(
  table: string,
  columns: string[],
  options: {
    indexName?: string
    unique?: boolean
  } = {},
): Promise<boolean> {
  const { indexName = `idx_${table}_${columns.join("_")}`, unique = false } = options

  // Check if index already exists
  const exists = await checkIndexExists(table, indexName)
  if (exists) {
    return true
  }

  // Create the index
  const adminClient = createAdminClient()

  const { error } = await adminClient.rpc("create_index", {
    p_table: table,
    p_index: indexName,
    p_columns: columns,
    p_unique: unique,
  })

  if (error) {
    console.error("Error creating index:", error)
    return false
  }

  return true
}

/**
 * Get all indexes for a table
 */
export async function getTableIndexes(table: string): Promise<IndexInfo[]> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient.rpc("get_table_indexes", {
    p_table: table,
  })

  if (error) {
    console.error("Error getting table indexes:", error)
    return []
  }

  return data || []
}

/**
 * Create recommended indexes for common tables
 */
export async function createRecommendedIndexes(): Promise<boolean> {
  try {
    // Profiles table indexes
    await createIndexIfNotExists("profiles", ["username"], { unique: true })
    await createIndexIfNotExists("profiles", ["email"], { unique: true })

    // Comments table indexes
    await createIndexIfNotExists("comments", ["post_id"])
    await createIndexIfNotExists("comments", ["user_id"])
    await createIndexIfNotExists("comments", ["parent_id"])
    await createIndexIfNotExists("comments", ["created_at"])
    await createIndexIfNotExists("comments", ["status"])

    // Comment reactions table indexes
    await createIndexIfNotExists("comment_reactions", ["comment_id"])
    await createIndexIfNotExists("comment_reactions", ["user_id"])
    await createIndexIfNotExists("comment_reactions", ["comment_id", "user_id"], { unique: true })

    // Notifications table indexes
    await createIndexIfNotExists("notifications", ["user_id"])
    await createIndexIfNotExists("notifications", ["created_at"])
    await createIndexIfNotExists("notifications", ["is_read"])
    await createIndexIfNotExists("notifications", ["user_id", "is_read"])

    // Bookmarks table indexes
    await createIndexIfNotExists("bookmarks", ["user_id"])
    await createIndexIfNotExists("bookmarks", ["post_id"])
    await createIndexIfNotExists("bookmarks", ["user_id", "post_id"], { unique: true })

    return true
  } catch (error) {
    console.error("Error creating recommended indexes:", error)
    return false
  }
}

/**
 * Analyze tables to update statistics for query planner
 */
export async function analyzeTables(tables: string[]): Promise<boolean> {
  const adminClient = createAdminClient()

  try {
    for (const table of tables) {
      const { error } = await adminClient.rpc("analyze_table", {
        p_table: table,
      })

      if (error) {
        console.error(`Error analyzing table ${table}:`, error)
      }
    }

    return true
  } catch (error) {
    console.error("Error analyzing tables:", error)
    return false
  }
}
