import type { ReactNode } from "react"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"
import {
  resolveInitialAuthState,
  resolveInitialPreferences,
} from "../(authed)/layout"

export const dynamic = "force-dynamic"

interface PublicLayoutProps {
  children: ReactNode
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const [initialAuthState, initialPreferences] = await Promise.all([
    resolveInitialAuthState(),
    resolveInitialPreferences(),
  ])

  return (
    <Providers initialAuthState={initialAuthState} initialPreferences={initialPreferences}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}
