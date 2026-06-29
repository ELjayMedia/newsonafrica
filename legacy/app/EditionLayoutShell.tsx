import type { ReactNode } from "react"

import { LayoutStructure } from "@/components/LayoutStructure"

interface EditionLayoutShellProps {
  children: ReactNode
  countryCode: string
}

export function EditionLayoutShell({ children, countryCode }: EditionLayoutShellProps) {
  return (
    <LayoutStructure countryCode={countryCode}>
      <main className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]">
        <div className="p-2 md:p-4 w-full md:w-auto">{children}</div>
      </main>
    </LayoutStructure>
  )
}
