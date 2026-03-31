import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const countryCode = resolveCountryForLayout(undefined)

  return <EditionLayoutShell countryCode={countryCode}>{children}</EditionLayoutShell>
}
