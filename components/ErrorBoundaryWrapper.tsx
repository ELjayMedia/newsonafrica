"use client"

import ErrorBoundary from "./ErrorBoundary"
import type { ReactNode } from "react"

interface ErrorBoundaryWrapperProps {
  children: ReactNode
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary fallback={<div>Something went wrong</div>}>{children}</ErrorBoundary>
}
