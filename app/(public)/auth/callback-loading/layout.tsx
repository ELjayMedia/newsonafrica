import type { ReactNode } from "react"

import { EditionLayoutShell } from "@/app/EditionLayoutShell"
import { resolveCountryForLayout } from "@/lib/utils/routing"

interface CallbackLoadingLayoutProps {
  children: ReactNode
}

export default function CallbackLoadingLayout({ children }: CallbackLoadingLayoutProps) {
  const countryCode = resolveCountryForLayout(undefined)

  return <EditionLayoutShell countryCode={countryCode}>{children}</EditionLayoutShell>
}
