"use client"

import type { ReactNode } from "react"

import MediaQueryRenderer from "./MediaQueryRenderer"

export interface ResponsiveWrapperProps {
  children?: ReactNode | ((matches: boolean) => ReactNode)
  mobileContent?: ReactNode
  desktopContent?: ReactNode
  breakpoint?: string
  fallback?: ReactNode
  ssrSafe?: boolean
}

export default function ResponsiveWrapper({
  children,
  mobileContent,
  desktopContent,
  breakpoint = "(min-width: 768px)",
  fallback,
  ssrSafe = false,
}: ResponsiveWrapperProps) {
  const resolvedFallback = fallback ?? mobileContent ?? null

  return (
    <MediaQueryRenderer query={breakpoint} ssrSafe={ssrSafe} fallback={resolvedFallback}>
      {(matches) => {
        if (mobileContent || desktopContent) {
          if (mobileContent && desktopContent) {
            return matches ? desktopContent : mobileContent
          }

          if (desktopContent) {
            return matches ? desktopContent : resolvedFallback
          }

          if (mobileContent) {
            return matches ? resolvedFallback : mobileContent
          }
        }

        if (typeof children === "function") {
          return children(matches)
        }

        return children ?? null
      }}
    </MediaQueryRenderer>
  )
}
