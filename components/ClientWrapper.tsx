"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRef } from "react"
import { UserProvider } from "@/contexts/UserContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  // Use ref to avoid recreating the client on each render
  const queryClientRef = useRef<QueryClient | null>(null)

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          cacheTime: 5 * 60 * 1000, // 5 minutes
          retry: 1,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    })
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <UserProvider>
        <BookmarksProvider>{children}</BookmarksProvider>
      </UserProvider>
    </QueryClientProvider>
  )
}
