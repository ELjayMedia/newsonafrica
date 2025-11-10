import type { ReactNode } from "react"

import AppClientProviders from "@/components/providers/AppClientProviders"
import PreferredCountryEffect from "@/components/leaves/PreferredCountryEffect"
import ScrollRestoration from "@/components/leaves/ScrollRestoration"
import ClientDynamics from "@/components/leaves/ClientDynamics"

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <AppClientProviders>
      <PreferredCountryEffect />
      <ScrollRestoration />
      <ClientDynamics />
      {children}
    </AppClientProviders>
  )
}
