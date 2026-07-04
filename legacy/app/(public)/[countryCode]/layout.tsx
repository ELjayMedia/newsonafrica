import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface CountryLayoutProps {
  children: ReactNode
  params: Promise<{
    countryCode?: string
  }>
}

export default async function CountryLayout({ children, params }: CountryLayoutProps) {
  const resolvedParams = await params
  const countryCode = resolveCountryForLayout(resolvedParams?.countryCode)

  return (
    <EditionLayoutShell countryCode={countryCode}>
      {children}
    </EditionLayoutShell>
  )
}