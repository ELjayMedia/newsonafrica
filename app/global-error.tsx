"use client"

import { usePathname } from "next/navigation"

import { AppLayoutInner } from "@/components/layout/AppLayoutInner"
import { GlobalErrorContent } from "@/components/GlobalErrorContent"
import { getCurrentCountry } from "@/lib/utils/routing"

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const pathname = usePathname()
  const resolvedCountry = getCurrentCountry(pathname ?? undefined)

  return (
    <html lang="en" className="font-sans">
      <body className="bg-background font-sans antialiased">
        <AppLayoutInner initialCountry={resolvedCountry}>
          <GlobalErrorContent reset={reset} />
        </AppLayoutInner>
      </body>
    </html>
  )
}
