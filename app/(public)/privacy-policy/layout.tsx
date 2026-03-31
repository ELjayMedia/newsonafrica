import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface PrivacyPolicyLayoutProps {
  children: ReactNode
}

export default function PrivacyPolicyLayout({ children }: PrivacyPolicyLayoutProps) {
  const countryCode = resolveCountryForLayout(undefined)

  return <EditionLayoutShell countryCode={countryCode}>{children}</EditionLayoutShell>
}
