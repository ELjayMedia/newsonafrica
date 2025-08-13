'use client';

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { fetchGraphQLClient } from '@/lib/graphql-client';

interface UseQueryOptions {
  variables?: Record<string, any>;
  skip?: boolean;
}

export function useQuery<T = any>(query: string, options: UseQueryOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    if (options.skip) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await fetchGraphQLClient(query, options.variables || {}, token);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [query, options.variables, options.skip, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

interface UseMutationOptions {
  onCompleted?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useMutation<T = any, V = Record<string, any>>(
  mutation: string,
  options: UseMutationOptions = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { token } = useAuth();

  const execute = useCallback(
    async (variables?: V) => {
      try {
        setLoading(true);
        const result = await fetchGraphQLClient(mutation, variables || {}, token);
        setData(result);
        setError(null);
        options.onCompleted?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [mutation, token, options],
  );

  return [execute, { data, loading, error }] as const;
}
