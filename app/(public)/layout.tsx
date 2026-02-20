import type { ReactNode } from "react"

import { Providers } from "../providers"

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <Providers initialAuthState={null} initialPreferences={null}>
      {children}
    </Providers>
  )
}
