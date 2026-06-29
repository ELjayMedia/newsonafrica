"use client"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import { type ReactNode, useEffect, useMemo, useState } from "react"

type MediaQueryRenderFn = (matches: boolean) => ReactNode

export interface MediaQueryRendererProps {
  query: string
  children: MediaQueryRenderFn
  fallback?: ReactNode
  /**
   * Wait until the component has mounted on the client before rendering
   * the result of the render function. When enabled, the fallback will be
   * rendered during SSR and the initial client paint.
   */
  ssrSafe?: boolean
}

export default function MediaQueryRenderer({
  query,
  children,
  fallback = null,
  ssrSafe = false,
}: MediaQueryRendererProps) {
  const matches = useMediaQuery(query)
  const [hasMounted, setHasMounted] = useState(!ssrSafe)

  useEffect(() => {
    if (ssrSafe) {
      setHasMounted(true)
    }
  }, [ssrSafe])

  const content = useMemo(() => children(matches), [children, matches])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{content}</>
}
