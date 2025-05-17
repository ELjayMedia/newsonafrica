import dynamic from "next/dynamic"
import type { ComponentType } from "react"

// Helper function to lazy load skeleton components with default loading state
export function lazyLoadSkeleton<T>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  options = { ssr: false },
) {
  return dynamic(importFunc, {
    ssr: options.ssr,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-md h-full w-full min-h-[100px]"></div>,
  })
}
