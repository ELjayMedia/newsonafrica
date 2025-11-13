import { Suspense, type ReactNode } from "react"

import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { Card } from "@/components/ui/card"
import { NewsSidebarLayout, Stack } from "@/components/ui/grid"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

interface LayoutStructureProps {
  children: ReactNode
  countryCode?: string
}

export function LayoutStructure({ children, countryCode }: LayoutStructureProps) {
  const resolvedCountry = (countryCode ?? DEFAULT_COUNTRY).toLowerCase()

  return (
    <Stack space={6} className="mx-auto w-full max-w-[980px] space-y-6">
      <Suspense fallback={<div className="h-20 w-full rounded-xl border border-border/60 bg-card shadow-sm" />}>
        <Header countryCode={resolvedCountry} />
      </Suspense>
      <NewsSidebarLayout className="items-start gap-6">
        <Suspense
          fallback={
            <Card className="h-[560px] w-full border border-border/60 shadow-sm" aria-hidden="true" />
          }
        >
          <Card className="w-full overflow-hidden border border-border/60 shadow-sm">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </Card>
        </Suspense>
        <aside>
          <Suspense fallback={<Card className="h-[480px] w-full border border-border/60 shadow-sm" aria-hidden="true" />}>
            <Sidebar country={resolvedCountry} />
          </Suspense>
        </aside>
      </NewsSidebarLayout>
    </Stack>
  )
}
