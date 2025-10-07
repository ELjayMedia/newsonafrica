"use client"

import { Suspense } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"

const DESKTOP_BREAKPOINT = "(min-width: 1024px)"

export function Sidebar() {
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT)

  if (!isDesktop) {
    return (
      <aside className="hidden lg:block w-full max-w-sm xl:max-w-md space-y-6 sticky top-4 self-start">
        <SidebarSkeleton />
      </aside>
    )
  }

  return (
    <aside className="hidden lg:block w-full max-w-sm xl:max-w-md space-y-6 sticky top-4 self-start">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>
    </aside>
  )
}
