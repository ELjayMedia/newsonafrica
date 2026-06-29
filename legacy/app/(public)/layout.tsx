import type { ReactNode } from "react"

import { Providers } from "../providers"
import { AppChrome } from "../AppChrome"

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <Providers initialAuthState={null} initialPreferences={null}>
      <AppChrome>{children}</AppChrome>
    </Providers>
  )
}
