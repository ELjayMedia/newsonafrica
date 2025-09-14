"use client"

import dynamic from "next/dynamic"

// Dynamically import components that might cause hydration issues
const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), { ssr: false })
const ServiceWorkerManager = dynamic(
  () => import("@/components/ServiceWorkerManager").then((mod) => ({ default: mod.ServiceWorkerManager })),
  { ssr: false },
)
const BackgroundSync = dynamic(() => import("@/components/BackgroundSync"), { ssr: false })

export function ClientDynamicComponents() {
  return (
    <>
      <ServiceWorkerRegistration />
      <ServiceWorkerManager />
      <BackgroundSync />
    </>
  )
}
