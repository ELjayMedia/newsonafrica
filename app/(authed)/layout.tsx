import type { ReactNode } from "react"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"

interface AuthedLayoutProps {
  children: ReactNode
}

// Auth/preferences will be bootstrapped client-side in Providers
export default function AuthedLayout({ children }: AuthedLayoutProps) {
  return (
    <Providers initialAuthState={null} initialPreferences={null}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}
