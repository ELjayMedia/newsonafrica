import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface ResetPasswordLayoutProps {
  children: ReactNode
}

export default function ResetPasswordLayout({ children }: ResetPasswordLayoutProps) {
  const countryCode = resolveCountryForLayout(undefined)

  return <EditionLayoutShell countryCode={countryCode}>{children}</EditionLayoutShell>
}
