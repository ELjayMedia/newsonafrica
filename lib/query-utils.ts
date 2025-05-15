"use client"

import { supabase } from "@/lib/supabase"
import { useCallback, useEffect, useMemo, useState } from "react"

// Cache for query results
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a cache key from query parameters
 */
export function generateCacheKey(table: string, query: Record<string, any>): string {
  return `${table}:${JSON.stringify(query)}`
}

/**
 * Execute a query with caching
 */
export async function executeQueryWithCache<T>(
  table: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    cacheKey?: string
    ttl?: number
    forceFresh?: boolean
  } = {},
): Promise<{ data: T | null; error: any; fromCache?: boolean }> {
  const cacheKey = options.cacheKey || table
  const ttl = options.ttl || CACHE_TTL
  const forceFresh = options.forceFresh || false

  // Check cache first (unless forceFresh is true)
  if (!forceFresh) {
    const cached = queryCache.get(cacheKey)
    const now = Date.now()

    if (cached && now - cached.timestamp < ttl) {
      return { data: cached.data, error: null, fromCache: true }
    }
  }

  // Execute the query
  const { data, error } = await queryFn()

  // Update cache if successful
  if (!error && data) {
    queryCache.set(cacheKey, { data, timestamp: Date.now() })
  }

  return { data, error }
}

/**
 * Clear the entire query cache or a specific entry
 */
export function clearQueryCache(cacheKey?: string): void {
  if (cacheKey) {
    queryCache.delete(cacheKey)
  } else {
    queryCache.clear()
  }
}

/**
 * Optimized select query with column selection and caching
 */
export async function optimizedSelect<T>(
  table: string,
  options: {
    columns?: string
    filters?: Record<string, any>
    pagination?: { page: number; pageSize: number }
    orderBy?: { column: string; ascending?: boolean }
    cacheKey?: string
    ttl?: number
    forceFresh?: boolean
    relationships?: string[]
  } = {},
): Promise<{ data: T[] | null; error: any; count?: number; fromCache?: boolean }> {
  const { columns = "*", filters = {}, pagination, orderBy, cacheKey, ttl, forceFresh, relationships = [] } = options

  // Build the query
  const queryFn = async () => {
    let query = supabase.from(table).select(columns, { count: pagination ? "exact" : undefined })

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null)
      } else if (Array.isArray(value)) {
        query = query.in(key, value)
      } else if (typeof value === "object" && value !== null) {
        if ("gt" in value) query = query.gt(key, value.gt)
        if ("gte" in value) query = query.gte(key, value.gte)
        if ("lt" in value) query = query.lt(key, value.lt)
        if ("lte" in value) query = query.lte(key, value.lte)
        if ("like" in value) query = query.like(key, value.like)
        if ("ilike" in value) query = query.ilike(key, value.ilike)
        if ("neq" in value) query = query.neq(key, value.neq)
      } else {
        query = query.eq(key, value)
      }
    })

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
    }

    // Apply pagination
    if (pagination) {
      const { page, pageSize } = pagination
      const start = page * pageSize
      const end = start + pageSize - 1
      query = query.range(start, end)
    }

    // Execute the query
    const { data, error, count } = await query

    return { data, error, count }
  }

  // Execute with caching
  const generatedCacheKey =
    cacheKey || generateCacheKey(table, { columns, filters, pagination, orderBy, relationships })
  const result = await executeQueryWithCache<{ data: T[]; count?: number }>(table, queryFn, {
    cacheKey: generatedCacheKey,
    ttl,
    forceFresh,
  })

  return {
    data: result.data?.data || null,
    error: result.error,
    count: result.data?.count,
    fromCache: result.fromCache,
  }
}

/**
 * Optimized single record fetch
 */
export async function optimizedGetById<T>(
  table: string,
  id: string,
  options: {
    columns?: string
    cacheKey?: string
    ttl?: number
    forceFresh?: boolean
    relationships?: string[]
  } = {},
): Promise<{ data: T | null; error: any; fromCache?: boolean }> {
  const { columns = "*", cacheKey, ttl, forceFresh, relationships = [] } = options

  // Build the query
  const queryFn = async () => {
    let query = supabase.from(table).select(columns)

    // Apply relationships if needed
    if (relationships.length > 0) {
      const selectString = `${columns}${relationships.map((rel) => `, ${rel}`).join("")}`
      query = supabase.from(table).select(selectString)
    }

    return await query.eq("id", id).single()
  }

  // Execute with caching
  const generatedCacheKey = cacheKey || `${table}:${id}:${columns}:${relationships.join(",")}`
  return await executeQueryWithCache<T>(table, queryFn, {
    cacheKey: generatedCacheKey,
    ttl,
    forceFresh,
  })
}

/**
 * Optimized batch insert
 */
export async function optimizedBatchInsert<T>(
  table: string,
  records: Record<string, any>[],
  options: {
    batchSize?: number
    returnData?: boolean
    columns?: string
  } = {},
): Promise<{ data: T[] | null; error: any }> {
  const { batchSize = 100, returnData = false, columns = "*" } = options

  // If no records, return early
  if (!records.length) {
    return { data: [], error: null }
  }

  // If batch size is larger than records, just do a single insert
  if (batchSize >= records.length) {
    const query = supabase.from(table).insert(records)
    if (returnData) {
      query.select(columns)
    }
    return await query
  }

  // Otherwise, batch the inserts
  const batches = []
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const query = supabase.from(table).insert(batch)
    if (returnData) {
      query.select(columns)
    }
    batches.push(query)
  }

  // Execute all batches
  const results = await Promise.all(batches)

  // Combine results
  const combinedData: any[] = []
  let firstError = null

  for (const result of results) {
    if (result.error) {
      firstError = result.error
      break
    }
    if (result.data && returnData) {
      combinedData.push(...result.data)
    }
  }

  return {
    data: returnData ? combinedData : null,
    error: firstError,
  }
}

/**
 * Optimized batch update
 */
export async function optimizedBatchUpdate<T>(
  table: string,
  records: { id: string; data: Record<string, any> }[],
  options: {
    batchSize?: number
    returnData?: boolean
    columns?: string
  } = {},
): Promise<{ data: T[] | null; error: any }> {
  const { batchSize = 100, returnData = false, columns = "*" } = options

  // If no records, return early
  if (!records.length) {
    return { data: [], error: null }
  }

  // Execute updates in batches
  const batches = []
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    // For each record in the batch, create an update query
    const batchPromises = batch.map(({ id, data }) => {
      const query = supabase.from(table).update(data).eq("id", id)
      if (returnData) {
        return query.select(columns)
      }
      return query
    })

    batches.push(Promise.all(batchPromises))
  }

  // Execute all batches
  const batchResults = await Promise.all(batches)

  // Combine results
  const combinedData: any[] = []
  let firstError = null

  for (const results of batchResults) {
    for (const result of results) {
      if (result.error) {
        firstError = result.error
        break
      }
      if (result.data && returnData) {
        combinedData.push(...(Array.isArray(result.data) ? result.data : [result.data]))
      }
    }
    if (firstError) break
  }

  return {
    data: returnData ? combinedData : null,
    error: firstError,
  }
}

/**
 * Cursor-based pagination for efficient paging through large datasets
 */
export async function cursorPagination<T>(
  table: string,
  options: {
    columns?: string
    filters?: Record<string, any>
    pageSize?: number
    cursor?: string
    cursorColumn?: string
    ascending?: boolean
    cacheKey?: string
    ttl?: number
  } = {},
): Promise<{
  data: T[] | null
  error: any
  nextCursor: string | null
  fromCache?: boolean
}> {
  const {
    columns = "*",
    filters = {},
    pageSize = 20,
    cursor,
    cursorColumn = "created_at",
    ascending = false,
    cacheKey,
    ttl,
  } = options

  // Build the query
  const queryFn = async () => {
    let query = supabase.from(table).select(columns)

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null)
      } else if (Array.isArray(value)) {
        query = query.in(key, value)
      } else if (typeof value === "object" && value !== null) {
        if ("gt" in value) query = query.gt(key, value.gt)
        if ("gte" in value) query = query.gte(key, value.gte)
        if ("lt" in value) query = query.lt(key, value.lt)
        if ("lte" in value) query = query.lte(key, value.lte)
        if ("like" in value) query = query.like(key, value.like)
        if ("ilike" in value) query = query.ilike(key, value.ilike)
        if ("neq" in value) query = query.neq(key, value.neq)
      } else {
        query = query.eq(key, value)
      }
    })

    // Apply cursor if provided
    if (cursor) {
      if (ascending) {
        query = query.gt(cursorColumn, cursor)
      } else {
        query = query.lt(cursorColumn, cursor)
      }
    }

    // Apply ordering and limit
    query = query.order(cursorColumn, { ascending }).limit(pageSize + 1) // +1 to check if there are more pages

    // Execute the query
    const { data, error } = await query

    // Determine next cursor
    let nextCursor = null
    if (data && data.length > pageSize) {
      nextCursor = data[pageSize - 1][cursorColumn]
      data.pop() // Remove the extra item
    }

    return { data, error, nextCursor }
  }

  // Execute with caching
  const generatedCacheKey =
    cacheKey || generateCacheKey(table, { columns, filters, pageSize, cursor, cursorColumn, ascending })
  const result = await executeQueryWithCache<{ data: T[]; nextCursor: string | null }>(table, queryFn, {
    cacheKey: generatedCacheKey,
    ttl,
  })

  return {
    data: result.data?.data || null,
    error: result.error,
    nextCursor: result.data?.nextCursor || null,
    fromCache: result.fromCache,
  }
}

/**
 * React hook for optimized queries with SWR-like functionality
 */
export function useOptimizedQuery<T>(
  table: string,
  options: {
    columns?: string
    filters?: Record<string, any>
    pagination?: { page: number; pageSize: number }
    orderBy?: { column: string; ascending?: boolean }
    cacheKey?: string
    ttl?: number
    dependencies?: any[]
    relationships?: string[]
    enabled?: boolean
  } = {},
) {
  const {
    columns = "*",
    filters = {},
    pagination,
    orderBy,
    cacheKey,
    ttl,
    dependencies = [],
    relationships = [],
    enabled = true,
  } = options

  const [data, setData] = useState<T[] | null>(null)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [count, setCount] = useState<number | undefined>(undefined)

  // Memoize the query parameters to prevent unnecessary re-fetches
  const queryParams = useMemo(
    () => ({ columns, filters, pagination, orderBy, relationships }),
    [
      columns,
      JSON.stringify(filters),
      JSON.stringify(pagination),
      JSON.stringify(orderBy),
      JSON.stringify(relationships),
    ],
  )

  // Generate a stable cache key
  const stableCacheKey = useMemo(
    () => cacheKey || generateCacheKey(table, queryParams),
    [table, cacheKey, JSON.stringify(queryParams)],
  )

  // Fetch function
  const fetchData = useCallback(
    async (forceFresh = false) => {
      if (!enabled) return

      setLoading(true)
      try {
        const result = await optimizedSelect<T>(table, {
          ...queryParams,
          cacheKey: stableCacheKey,
          ttl,
          forceFresh,
        })

        setData(result.data)
        setError(result.error)
        setCount(result.count)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    },
    [table, stableCacheKey, ttl, enabled, JSON.stringify(queryParams)],
  )

  // Refetch function exposed to the component
  const refetch = useCallback(() => fetchData(true), [fetchData])

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  return { data, error, loading, count, refetch }
}

/**
 * React hook for cursor-based pagination
 */
export function useCursorPagination<T>(
  table: string,
  options: {
    columns?: string
    filters?: Record<string, any>
    pageSize?: number
    cursorColumn?: string
    ascending?: boolean
    cacheKey?: string
    ttl?: number
    dependencies?: any[]
    enabled?: boolean
  } = {},
) {
  const {
    columns = "*",
    filters = {},
    pageSize = 20,
    cursorColumn = "created_at",
    ascending = false,
    cacheKey,
    ttl,
    dependencies = [],
    enabled = true,
  } = options

  const [data, setData] = useState<T[]>([])
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)

  // Memoize the query parameters to prevent unnecessary re-fetches
  const queryParams = useMemo(
    () => ({ columns, filters, pageSize, cursorColumn, ascending }),
    [columns, JSON.stringify(filters), pageSize, cursorColumn, ascending],
  )

  // Generate a stable cache key
  const stableCacheKey = useMemo(
    () => cacheKey || generateCacheKey(table, { ...queryParams, cursor: "initial" }),
    [table, cacheKey, JSON.stringify(queryParams)],
  )

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setData([])
    setNextCursor(null)
    setHasMore(true)

    try {
      const result = await cursorPagination<T>(table, {
        ...queryParams,
        cacheKey: stableCacheKey,
        ttl,
      })

      setData(result.data || [])
      setNextCursor(result.nextCursor)
      setHasMore(!!result.nextCursor)
      setError(result.error)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [table, stableCacheKey, ttl, enabled, JSON.stringify(queryParams)])

  // Fetch more data
  const fetchMore = useCallback(async () => {
    if (!enabled || !hasMore || loading || !nextCursor) return

    setLoading(true)
    try {
      const result = await cursorPagination<T>(table, {
        ...queryParams,
        cursor: nextCursor,
        cacheKey: `${stableCacheKey}:${nextCursor}`,
        ttl,
      })

      if (result.data) {
        setData((prev) => [...prev, ...result.data!])
      }
      setNextCursor(result.nextCursor)
      setHasMore(!!result.nextCursor)
      setError(result.error)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [table, nextCursor, hasMore, loading, stableCacheKey, ttl, enabled, JSON.stringify(queryParams)])

  // Reset and refetch
  const reset = useCallback(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData, ...dependencies])

  return { data, error, loading, hasMore, fetchMore, reset }
}
