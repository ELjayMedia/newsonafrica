import dynamic from "next/dynamic"
import type { ComponentType } from "react"

/**
 * Simple dynamic import wrapper
 */
export function safeDynamicImport<P = {}>(importFn: () => Promise<{ default: ComponentType<P> }>, options = {}) {
  return dynamic(importFn, options)
}
