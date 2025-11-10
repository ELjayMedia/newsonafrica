"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

const ScrollToTop = dynamic(
  async () => {
    const mod = await import("@/components/ScrollToTop")
    return mod.ScrollToTop
  },
  {
    ssr: false,
    loading: () => null,
  },
)

export default function ScrollRestoration() {
  return (
    <Suspense fallback={null}>
      <ScrollToTop />
    </Suspense>
  )
}
