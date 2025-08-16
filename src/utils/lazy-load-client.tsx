"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"

/**
 * Lazily loads a component with a loading fallback
 */
export function lazyLoadComponent<T>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  LoadingComponent: ComponentType<T> | null = null,
) {
  return dynamic(importFunc, {
    loading: LoadingComponent ? () => <LoadingComponent /> : undefined,
    ssr: false,
  })
}

/**
 * Lazily loads a component with a skeleton loading state
 */
export function lazyLoadSkeleton<T>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  SkeletonComponent: ComponentType<T>,
) {
  return dynamic(importFunc, {
    loading: () => <SkeletonComponent />,
    ssr: false,
  })
}
