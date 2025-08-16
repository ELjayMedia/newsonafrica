"use client"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import { type ReactNode, useEffect, useState } from "react"

interface ClientOnlyMediaQueryProps {
  query: string
  children: (matches: boolean) => ReactNode
  fallback?: ReactNode
}

export default function ClientOnlyMediaQuery({ query, children, fallback }: ClientOnlyMediaQueryProps) {
  const [mounted, setMounted] = useState(false)
  const matches = useMediaQuery(query)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children(matches)}</>
}
