import type { ReactNode } from "react"

import { AppChrome } from "@/components/layout/AppChrome"
import TopBar from "@/components/leaves/TopBarClient"
import BottomNavigation from "@/components/leaves/BottomNavigationClient"
import GlobalToaster from "@/components/leaves/GlobalToaster"

type LayoutParams = Record<string, string | string[] | undefined>

export default function ShellLayout({
  children,
  params,
}: {
  children: ReactNode
  params: LayoutParams
}) {
  const countryParam = params?.countryCode
  const countryCode = Array.isArray(countryParam) ? countryParam[0] : countryParam

  return (
    <>
      <TopBar />
      <AppChrome countryCode={countryCode}>{children}</AppChrome>
      <BottomNavigation />
      <GlobalToaster />
    </>
  )
}
