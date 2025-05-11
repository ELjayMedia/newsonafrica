import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { AdSense } from "@/components/AdSense"
import { AdErrorBoundary } from "@/components/AdErrorBoundary"

export function Sidebar() {
  return (
    <aside className="hidden md:block w-full max-w-xs space-y-6">
      {/* Main sidebar content */}
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>

      {/* Third AdSense ad at the bottom of sidebar */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <AdErrorBoundary collapse={true}>
          <AdSense slot="8721564553" format="rectangle" className="w-full min-w-[300px] h-[250px]" />
        </AdErrorBoundary>
      </div>
    </aside>
  )
}
