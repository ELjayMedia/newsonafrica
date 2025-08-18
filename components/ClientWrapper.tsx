import logger from "@/utils/logger";
"use client"

import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRef, useState, useEffect } from "react"
import { UserProvider } from "@/contexts/UserContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"

// Create a persistent QueryClient instance
const createQueryClient = () =>
  new QueryClient({
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

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  // Use state to ensure proper hydration
  const [mounted, setMounted] = useState(false)

  // Use ref to avoid recreating the client on each render
  const queryClientRef = useRef<QueryClient | null>(null)

  // Initialize the query client only once
  if (!queryClientRef.current) {
    queryClientRef.current = createQueryClient()
  }

  // Ensure hydration is complete before rendering
  useEffect(() => {
    setMounted(true)

    // Add performance monitoring in development
    if (process.env.NODE_ENV === "development") {
      const startTime = performance.now()
      return () => {
        const endTime = performance.now()
        logger.info(`[Performance] ClientWrapper mounted in ${(endTime - startTime).toFixed(2)}ms`)
      }
    }
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
