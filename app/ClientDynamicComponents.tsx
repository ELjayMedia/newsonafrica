"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), { ssr: false })

const GlobalErrorBoundary = dynamic(() => import("@/components/GlobalErrorBoundary"), { ssr: false })

export function ClientDynamicComponents() {
  return (
    <>
      <Suspense fallback={null}>
        <ServiceWorkerRegistration />
      </Suspense>
      <Suspense fallback={null}>
        <GlobalErrorBoundary />
      </Suspense>
    </>
  )
}
