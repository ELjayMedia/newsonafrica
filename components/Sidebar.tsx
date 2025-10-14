import { Suspense } from "react"

import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"

export function Sidebar() {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarContent />
    </Suspense>
  )
}
