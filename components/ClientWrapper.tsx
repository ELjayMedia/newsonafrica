"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRef, useState, useEffect } from "react"
import { UserProvider } from "@/contexts/UserContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  // Use state to ensure proper hydration
  const [mounted, setMounted] = useState(false)

  // Use ref to avoid recreating the client on each render
  const queryClientRef = useRef<QueryClient | null>(null)

  // Initialize the query client only once
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

  // Ensure hydration is complete before rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <UserProvider>
        <BookmarksProvider>{children}</BookmarksProvider>
      </UserProvider>
    </QueryClientProvider>
  )
}
