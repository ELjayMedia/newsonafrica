"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { clearQueryCache, executeWithCache } from "@/lib/supabase/utils"

interface UseSupabaseQueryOptions<T> {
  enabled?: boolean
  initialData?: T
  cacheTime?: number
  staleTime?: number
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  refetchInterval?: number | false
  refetchOnWindowFocus?: boolean
  select?: (data: any) => T
}

interface UseSupabaseQueryResult<T> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  refetch: () => Promise<void>
}

/**
 * Custom hook for optimized Supabase queries with caching and refetching
 *
 * @param queryFn - Function that returns a Supabase query
 * @param queryKey - Unique key for this query (for caching)
 * @param options - Query options
 * @returns Query result with data, loading state, and refetch function
 */
export function useSupabaseQuery<T = any>(
  queryFn: () => Promise<T>,
  queryKey: string | string[],
  options: UseSupabaseQueryOptions<T> = {},
): UseSupabaseQueryResult<T> {
  const {
    enabled = true,
    initialData,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError,
    refetchInterval = false,
    refetchOnWindowFocus = true,
    select = (data) => data as T,
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(enabled)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)

  // Convert queryKey to string
  const cacheKey = Array.isArray(queryKey) ? queryKey.join(":") : queryKey

  // Function to fetch data
  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await executeWithCache(queryFn, cacheKey, cacheTime, { force })

        const processedData = select(result)
        setData(processedData)
        setIsSuccess(true)

        if (onSuccess) {
          onSuccess(processedData)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setIsSuccess(false)

      if (onError) {
        onError(error)
      }
      } finally {
        setIsLoading(false)
      }
    },
    [cacheKey, cacheTime, enabled, onError, onSuccess, queryFn, select],
  )

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  // Set up refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return undefined

    const intervalId = setInterval(() => {
      fetchData()
    }, refetchInterval)

    return () => clearInterval(intervalId)
  }, [refetchInterval, fetchData, enabled])

  // Set up window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return undefined

    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener("focus", handleFocus)
    return () => {
      window.removeEventListener("focus", handleFocus)
    }
  }, [refetchOnWindowFocus, fetchData, enabled])

  return {
    data,
    error,
    isLoading,
    isError: !!error,
    isSuccess,
    refetch: async () => {
      clearQueryCache(cacheKey)
      await fetchData(true)
    },
  }
}

/**
 * Custom hook for optimized Supabase mutations
 *
 * @param mutationFn - Function that performs the mutation
 * @param options - Mutation options
 * @returns Mutation function and state
 */
export function useSupabaseMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void
    invalidateQueries?: (string | RegExp)[]
  } = {},
) {
  const { onSuccess, onError, onSettled, invalidateQueries = [] } = options
  const [data, setData] = useState<TData | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    async (variables: TVariables) => {
      setError(null)

      return new Promise<TData>((resolve, reject) => {
        startTransition(() => {
          mutationFn(variables)
            .then((result) => {
              setData(result)

              invalidateQueries.forEach((queryKey) => {
                if (queryKey instanceof RegExp) {
                  clearQueryCache(undefined, queryKey)
                } else {
                  clearQueryCache(queryKey)
                }
              })

              if (onSuccess) {
                onSuccess(result, variables)
              }

              if (onSettled) {
                onSettled(result, null, variables)
              }

              resolve(result)
            })
            .catch((err) => {
              const errorObj = err instanceof Error ? err : new Error(String(err))
              setError(errorObj)

              if (onError) {
                onError(errorObj, variables)
              }

              if (onSettled) {
                onSettled(undefined, errorObj, variables)
              }

              reject(errorObj)
            })
        })
      })
    },
    [invalidateQueries, mutationFn, onError, onSettled, onSuccess, startTransition],
  )

  return {
    mutate,
    data,
    error,
    isLoading: isPending,
    isError: !!error,
    isSuccess: !!data && !error,
    reset: () => {
      setData(undefined)
      setError(null)
    },
  }
}
