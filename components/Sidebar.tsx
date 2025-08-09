import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { SidebarAd } from "./SidebarAd"

export function Sidebar() {
  return (
    <aside className="hidden md:block w-full max-w-xs space-y-6">
      {/* Main sidebar content */}
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>

      {/* Third AdSense ad at the bottom of sidebar */}
      <SidebarAd slot="8721564553" />
    </aside>
  )
}
