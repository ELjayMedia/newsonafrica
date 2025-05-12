"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

// Use dynamic import with no SSR to prevent prerendering
const LostPasswordContent = dynamic(
  () => import("@/components/LostPasswordContent").then((mod) => mod.LostPasswordContent),
  { ssr: false },
)

export function ClientLostPasswordWrapper() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">Loading...</div>}>
      <LostPasswordContent />
    </Suspense>
  )
}
