import type { ReactNode } from "react"
import dynamic from "next/dynamic"

import { AppChrome } from "@/components/layout/AppChrome"

const TopBar = dynamic(() => import("@/components/leaves/TopBarClient"), {
  ssr: false,
  loading: () => null,
})
const BottomNavigation = dynamic(() => import("@/components/leaves/BottomNavigationClient"), {
  ssr: false,
  loading: () => null,
})
const GlobalToaster = dynamic(() => import("@/components/leaves/GlobalToaster"), {
  ssr: false,
  loading: () => null,
})

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
