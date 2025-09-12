import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"

export function Sidebar() {
  return (
    <aside className="hidden md:block w-full max-w-xs space-y-6">
      {/* Main sidebar content */}
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>
    </aside>
  )
}
