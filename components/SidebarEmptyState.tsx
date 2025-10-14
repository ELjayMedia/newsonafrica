import { TrendingUp } from "lucide-react"
import { SidebarSectionCard, SidebarSectionHeader } from "./sidebarShared"

export function SidebarEmptyState() {
  return (
    <div className="space-y-6">
      <SidebarSectionCard className="p-6">
        <SidebarSectionHeader
          icon={<TrendingUp className="h-5 w-5 text-gray-600" />}
          title="Most Read"
          className="mb-4 pb-2 border-b border-gray-200"
        />
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm mb-2">No articles available</p>
          <p className="text-gray-400 text-xs">Check back soon for trending stories</p>
        </div>
      </SidebarSectionCard>

      <SidebarSectionCard className="p-6">
        <SidebarSectionHeader
          title="Latest News"
          className="mb-4 pb-2 border-b border-gray-200"
        />
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm mb-2">No articles available</p>
          <p className="text-gray-400 text-xs">Check back soon for updates</p>
        </div>
      </SidebarSectionCard>
    </div>
  )
}
