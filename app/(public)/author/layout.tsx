import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface AuthorLayoutProps {
  children: ReactNode
}

export default function AuthorLayout({ children }: AuthorLayoutProps) {
  const countryCode = resolveCountryForLayout(undefined)

  return <EditionLayoutShell countryCode={countryCode}>{children}</EditionLayoutShell>
}
