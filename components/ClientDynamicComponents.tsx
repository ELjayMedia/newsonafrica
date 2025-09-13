"use client"

import dynamic from "next/dynamic"

// Dynamically import components that might cause hydration issues
const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), { ssr: false })

export function ClientDynamicComponents() {
  return (
    <>
      <ServiceWorkerRegistration />
    </>
  )
}
