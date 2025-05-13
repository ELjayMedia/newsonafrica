"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Use dynamic import with ssr: false to ensure client-only rendering
const NewsContent = dynamic(() => import("@/components/NewsContent").then((mod) => mod.NewsContent), { ssr: false })

export function NewsClientWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading news content...</div>}>
      <NewsContent />
    </Suspense>
  )
}
