"use client"

import { Suspense } from "react"

import { ScrollToTop } from "@/components/ScrollToTop"

export default function ScrollRestoration() {
  return (
    <Suspense fallback={null}>
      <ScrollToTop />
    </Suspense>
  )
}
