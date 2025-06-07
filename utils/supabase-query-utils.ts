import type { PostgrestFilterBuilder } from "@supabase/postgrest-js"
import { createClient } from "./supabase/client"

// Cache for storing query results
interface QueryCacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

// Global query cache with configurable TTL
const queryCache = new Map<string, QueryCacheEntry<any>>()

// Default cache TTL in milliseconds (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000

/**
 * Clears the entire query cache or specific entries
 *
 * @param key - Optional specific cache key to clear
 * @param pattern - Optional pattern to match against cache keys
 */
export function clearQueryCache(key?: string, pattern?: RegExp): void {
  if (key) {
    queryCache.delete(key)
  } else if (pattern) {
    for (const cacheKey of queryCache.keys()) {
      if (pattern.test(cacheKey)) {
        queryCache.delete(cacheKey)
      }
    }
  } else {
    queryCache.clear()
  }
}

/**
 * Executes a Supabase query with caching
 *
 * @param queryBuilder - The Supabase query builder
 * @param cacheKey - The cache key for this query
 * @param ttl - Optional TTL in milliseconds
 * @returns The query result
 */
export async function executeWithCache<T>(
  queryBuilder: PostgrestFilterBuilder<any, any, any[]>,
  cacheKey: string,
  ttl: number = DEFAULT_CACHE_TTL,
): Promise<T[]> {
  const now = Date.now()

  // Check if we have a valid cached result
  const cached = queryCache.get(cacheKey)
  if (cached && now < cached.expiresAt) {
    return cached.data as T[]
  }

  try {
    // Execute the query
    const { data, error } = await queryBuilder

    if (error) {
      console.error("Supabase query error:", error)
      throw error
    }

    // Cache the result
    queryCache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    })

    return data as T[]
  } catch (error) {
    console.error("Error executing query:", error)
    throw error
  }
}

/**
 * Executes a batch of queries in parallel
 *
 * @param queries - Array of query functions that return promises
 * @returns Array of query results
 */
export async function executeBatch<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
  return Promise.all(queries.map((query) => query()))
}

/**
 * Creates a query key based on table name, filters, and other parameters
 *
 * @param table - The table name
 * @param params - Object containing query parameters
 * @returns A unique cache key
 */
export function createQueryKey(table: string, params: Record<string, any>): string {
  return `${table}:${JSON.stringify(params)}`
}

/**
 * Optimized function to fetch a single record by ID
 *
 * @param table - The table name
 * @param id - The record ID
 * @param options - Query options
 * @returns The record or null if not found
 */
export async function fetchById<T>(
  table: string,
  id: string,
  options: {
    columns?: string
    cache?: boolean
    ttl?: number
  } = {},
): Promise<T | null> {
  const { columns = "*", cache = true, ttl = DEFAULT_CACHE_TTL } = options
  const supabase = createClient()

  const cacheKey = `${table}:id:${id}:${columns}`

  if (cache) {
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T
    }
  }

  const { data, error } = await supabase.from(table).select(columns).eq("id", id).single()

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return null
    }
    console.error(`Error fetching ${table} by ID:`, error)
    throw error
  }

  if (cache) {
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })
  }

  return data as T
}

/**
 * Optimized function to fetch multiple records by their IDs
 *
 * @param table - The table name
 * @param ids - Array of record IDs
 * @param options - Query options
 * @returns Array of records
 */
export async function fetchByIds<T>(
  table: string,
  ids: string[],
  options: {
    columns?: string
    cache?: boolean
    ttl?: number
  } = {},
): Promise<T[]> {
  if (ids.length === 0) return []

  const { columns = "*", cache = true, ttl = DEFAULT_CACHE_TTL } = options
  const supabase = createClient()

  const cacheKey = `${table}:ids:${ids.join(",")}:${columns}`

  if (cache) {
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T[]
    }
  }

  const { data, error } = await supabase.from(table).select(columns).in("id", ids)

  if (error) {
    console.error(`Error fetching ${table} by IDs:`, error)
    throw error
  }

  if (cache && data) {
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })
  }

  return (data as T[]) || []
}

/**
 * Optimized function to insert records with proper error handling
 *
 * @param table - The table name
 * @param records - The record or records to insert
 * @param options - Insert options
 * @returns The inserted records
 */
export async function insertRecords<T>(
  table: string,
  records: Partial<T> | Partial<T>[],
  options: {
    returning?: string
    clearCache?: boolean | RegExp
  } = {},
): Promise<T[]> {
  const { returning = "*", clearCache = false } = options
  const supabase = createClient()

  const { data, error } = await supabase.from(table).insert(records).select(returning)

  if (error) {
    console.error(`Error inserting into ${table}:`, error)
    throw error
  }

  // Clear relevant cache entries
  if (clearCache === true) {
    clearQueryCache(undefined, new RegExp(`^${table}:`))
  } else if (clearCache instanceof RegExp) {
    clearQueryCache(undefined, clearCache)
  }

  return data as T[]
}

/**
 * Optimized function to update records with proper error handling
 *
 * @param table - The table name
 * @param id - The record ID
 * @param updates - The updates to apply
 * @param options - Update options
 * @returns The updated record
 */
export async function updateRecord<T>(
  table: string,
  id: string,
  updates: Partial<T>,
  options: {
    returning?: string
    clearCache?: boolean | RegExp
  } = {},
): Promise<T | null> {
  const { returning = "*", clearCache = false } = options
  const supabase = createClient()

  const { data, error } = await supabase.from(table).update(updates).eq("id", id).select(returning).single()

  if (error) {
    console.error(`Error updating ${table}:`, error)
    throw error
  }

  // Clear relevant cache entries
  if (clearCache === true) {
    clearQueryCache(undefined, new RegExp(`^${table}:`))
    clearQueryCache(`${table}:id:${id}:${returning}`)
  } else if (clearCache instanceof RegExp) {
    clearQueryCache(undefined, clearCache)
  }

  return data as T
}

/**
 * Optimized function to delete records with proper error handling
 *
 * @param table - The table name
 * @param id - The record ID
 * @param options - Delete options
 * @returns Success status
 */
export async function deleteRecord(
  table: string,
  id: string,
  options: {
    clearCache?: boolean | RegExp
  } = {},
): Promise<boolean> {
  const { clearCache = false } = options
  const supabase = createClient()

  const { error } = await supabase.from(table).delete().eq("id", id)

  if (error) {
    console.error(`Error deleting from ${table}:`, error)
    throw error
  }

  // Clear relevant cache entries
  if (clearCache === true) {
    clearQueryCache(undefined, new RegExp(`^${table}:`))
  } else if (clearCache instanceof RegExp) {
    clearQueryCache(undefined, clearCache)
  }

  return true
}

/**
 * Optimized function to count records with caching
 *
 * @param table - The table name
 * @param filters - Optional filter function
 * @param options - Count options
 * @returns The count of records
 */
export async function countRecords(
  table: string,
  filters?: (query: PostgrestFilterBuilder<any, any, any[]>) => PostgrestFilterBuilder<any, any, any[]>,
  options: {
    cache?: boolean
    ttl?: number
  } = {},
): Promise<number> {
  const { cache = true, ttl = DEFAULT_CACHE_TTL } = options
  const supabase = createClient()

  // Create a stable cache key based on the filter function
  const filterKey = filters ? filters.toString() : "none"
  const cacheKey = `${table}:count:${filterKey}`

  if (cache) {
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as number
    }
  }

  let query = supabase.from(table).select("*", { count: "exact", head: true })

  if (filters) {
    query = filters(query)
  }

  const { count, error } = await query

  if (error) {
    console.error(`Error counting ${table} records:`, error)
    throw error
  }

  if (cache) {
    queryCache.set(cacheKey, {
      data: count,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })
  }

  return count || 0
}

/**
 * Optimized function to fetch paginated records
 *
 * @param table - The table name
 * @param options - Pagination options
 * @returns Paginated records and metadata
 */
export async function fetchPaginated<T>(
  table: string,
  options: {
    page?: number
    pageSize?: number
    columns?: string
    orderBy?: string
    ascending?: boolean
    filters?: (query: PostgrestFilterBuilder<any, any, any[]>) => PostgrestFilterBuilder<any, any, any[]>
    cache?: boolean
    ttl?: number
  } = {},
): Promise<{
  data: T[]
  count: number
  pageCount: number
  hasMore: boolean
}> {
  const {
    page = 1,
    pageSize = 10,
    columns = "*",
    orderBy = "created_at",
    ascending = false,
    filters,
    cache = true,
    ttl = DEFAULT_CACHE_TTL,
  } = options

  const supabase = createClient()

  // Create a stable cache key based on the filter function
  const filterKey = filters ? filters.toString() : "none"
  const cacheKey = `${table}:paginated:${page}:${pageSize}:${columns}:${orderBy}:${ascending}:${filterKey}`

  if (cache) {
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
  }

  // Calculate range for pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Build query
  let query = supabase.from(table).select(columns, { count: "exact" }).order(orderBy, { ascending }).range(from, to)

  // Apply filters if provided
  if (filters) {
    query = filters(query)
  }

  // Execute query
  const { data, error, count } = await query

  if (error) {
    console.error(`Error fetching paginated ${table}:`, error)
    throw error
  }

  const result = {
    data: data as T[],
    count: count || 0,
    pageCount: Math.ceil((count || 0) / pageSize),
    hasMore: (count || 0) > page * pageSize,
  }

  if (cache) {
    queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })
  }

  return result
}

/**
 * Optimized function to upsert records (insert or update)
 *
 * @param table - The table name
 * @param records - The record or records to upsert
 * @param options - Upsert options
 * @returns The upserted records
 */
export async function upsertRecords<T>(
  table: string,
  records: Partial<T> | Partial<T>[],
  options: {
    onConflict?: string
    returning?: string
    clearCache?: boolean | RegExp
  } = {},
): Promise<T[]> {
  const { onConflict, returning = "*", clearCache = false } = options
  const supabase = createClient()

  let query = supabase.from(table).upsert(records)

  if (onConflict) {
    query = query.onConflict(onConflict)
  }

  const { data, error } = await query.select(returning)

  if (error) {
    console.error(`Error upserting into ${table}:`, error)
    throw error
  }

  // Clear relevant cache entries
  if (clearCache === true) {
    clearQueryCache(undefined, new RegExp(`^${table}:`))
  } else if (clearCache instanceof RegExp) {
    clearQueryCache(undefined, clearCache)
  }

  return data as T[]
}

/**
 * Checks if a column exists in a table
 *
 * @param table - The table name
 * @param column - The column name
 * @returns Whether the column exists
 */
export async function columnExists(table: string, column: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // First try using RPC if available
    const { data, error } = await supabase.rpc("column_exists", { table_name: table, column_name: column }).single()

    if (!error && data) {
      return data.exists
    }

    // Fallback: try selecting the column
    try {
      await supabase.from(table).select(column).limit(1)
      return true
    } catch (e) {
      return false
    }
  } catch (error) {
    console.error(`Error checking if column ${column} exists in table ${table}:`, error)
    return false
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of queryCache.entries()) {
    if (now > entry.expiresAt) {
      queryCache.delete(key)
    }
  }
}, 60000) // Run every minute
