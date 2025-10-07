import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"

export function Sidebar() {
  return (
    <aside className="hidden lg:block w-full max-w-sm xl:max-w-md space-y-6 sticky top-4 self-start">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>
    </aside>
  )
}
