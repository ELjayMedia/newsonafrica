"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"

/**
 * Lazily loads a component with a loading fallback
 */
export function lazyLoadComponent(
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  LoadingComponent: ComponentType<any> | null = null,
) {
  return dynamic(importFunc, {
    loading: LoadingComponent ? () => <LoadingComponent /> : undefined,
    ssr: false,
  })
}

/**
 * Lazily loads a component with a skeleton loading state
 */
export function lazyLoadSkeleton(
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  SkeletonComponent: ComponentType<any>,
) {
  return dynamic(importFunc, {
    loading: () => <SkeletonComponent />,
    ssr: false,
  })
}
