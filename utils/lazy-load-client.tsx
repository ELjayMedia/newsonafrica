"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"

/**
 * Helper function to lazy load components with a skeleton loading state
 * Client component version that supports ssr: false
 */
export function lazyLoadComponent<T>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  options = { ssr: true },
) {
  return dynamic(importFunc, {
    ssr: options.ssr,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-md h-full w-full min-h-[100px]"></div>,
  })
}

/**
 * Helper function to lazy load skeleton components with default loading state
 * Client component version that supports ssr: false
 */
export function lazyLoadSkeleton<T>(importFunc: () => Promise<{ default: ComponentType<T> }>, options = { ssr: true }) {
  return dynamic(importFunc, {
    ssr: options.ssr,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-md h-full w-full min-h-[100px]"></div>,
  })
}
