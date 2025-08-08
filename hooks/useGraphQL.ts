"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchGraphQLClient } from "@/lib/graphql-client"
import { useAuth } from "@/hooks/useAuth"

interface UseQueryOptions {
  variables?: Record<string, unknown>
  skip?: boolean
}

export function useQuery<T = unknown>(query: string, options: UseQueryOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { token } = useAuth()

  const fetchData = useCallback(async () => {
    if (options.skip) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await fetchGraphQLClient<T>(query, options.variables ?? {}, token)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [query, options.variables, options.skip, token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    return fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

interface UseMutationOptions<T = unknown> {
  onCompleted?: (data: T) => void
  onError?: (error: Error) => void
}

export function useMutation<
  T = unknown,
  V extends Record<string, unknown> = Record<string, unknown>,
>(mutation: string, options: UseMutationOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { token } = useAuth()

  const execute = useCallback(
    async (variables?: V) => {
      try {
        setLoading(true)
        const result = await fetchGraphQLClient<T>(
          mutation,
          (variables ?? {}) as Record<string, unknown>,
          token,
        )
        setData(result)
        setError(null)
        options.onCompleted?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        options.onError?.(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [mutation, token, options],
  )

  return [execute, { data, loading, error }] as const
}
