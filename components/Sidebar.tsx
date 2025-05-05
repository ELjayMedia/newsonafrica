import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"

export function Sidebar() {
  return (
    <aside className="w-full lg:w-80 lg:flex-shrink-0">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>
    </aside>
  )
}
