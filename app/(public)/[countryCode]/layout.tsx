import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface CountryLayoutProps {
  children: ReactNode
  params: {
    countryCode?: string
  }
}

export default function CountryLayout({ children, params }: CountryLayoutProps) {
  const countryCode = resolveCountryForLayout(params?.countryCode)

  return <EditionLayoutShell countryCode={countryCode}>{children}</EditionLayoutShell>
}
