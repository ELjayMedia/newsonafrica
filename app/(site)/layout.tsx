import type { ReactNode } from "react"
import dynamic from "next/dynamic"

const AppClientProviders = dynamic(() => import("@/components/providers/AppClientProviders"), {
  ssr: false,
})
const PreferredCountryEffect = dynamic(() => import("@/components/leaves/PreferredCountryEffect"), {
  ssr: false,
  loading: () => null,
})
const ScrollRestoration = dynamic(() => import("@/components/leaves/ScrollRestoration"), {
  ssr: false,
  loading: () => null,
})
const ClientDynamics = dynamic(() => import("@/components/leaves/ClientDynamics"), {
  ssr: false,
  loading: () => null,
})

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
