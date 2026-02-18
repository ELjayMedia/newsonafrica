import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface CountryLayoutProps {
  children: ReactNode
  params: Promise<{
    countryCode?: string
  }>  // ← Change type to Promise (recommended for clarity)
}

export default async function CountryLayout({ children, params }: CountryLayoutProps) {
  // Await params once at the top (safest pattern)
  const resolvedParams = await params;
  const countryCode = resolveCountryForLayout(resolvedParams?.countryCode);

  return <EditionLayoutShell countryCode={countryCode} children={undefined}>{children}</EditionLayoutShell>;
}