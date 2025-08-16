"use client"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import type { ReactNode } from "react"

interface MediaQueryComponentProps {
  query: string
  children: (matches: boolean) => ReactNode
  fallback?: ReactNode
}

export default function MediaQueryComponent({ query, children, fallback }: MediaQueryComponentProps) {
  const matches = useMediaQuery(query)

  return <>{children(matches)}</>
}
