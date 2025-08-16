"use client"

import dynamic from "next/dynamic"

// Dynamically import components that might cause hydration issues
const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), { ssr: false })
const WebVitals = dynamic(() => import("@/components/WebVitals"), { ssr: false })
const VercelSpeedInsights = dynamic(() => import("@/components/SpeedInsights"), { ssr: false })

export function ClientDynamicComponents() {
  return (
    <>
      <ServiceWorkerRegistration />
      <WebVitals />
      <VercelSpeedInsights />
    </>
  )
}
