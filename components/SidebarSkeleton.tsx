import { Skeleton } from "@/components/ui/skeleton"
import { SidebarSectionCard, SidebarSectionHeader } from "./sidebarShared"

export function SidebarSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Most Read Skeleton */}
      <SidebarSectionCard className="p-5">
        <SidebarSectionHeader>
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-28" />
        </SidebarSectionHeader>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100">
          <Skeleton className="h-3 w-32 mx-auto" />
        </div>
      </SidebarSectionCard>

      {/* Latest News Skeleton */}
      <SidebarSectionCard className="p-5">
        <SidebarSectionHeader>
          <Skeleton className="h-6 w-32" />
        </SidebarSectionHeader>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5">
              <Skeleton className="w-20 h-20 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </SidebarSectionCard>
    </div>
  )
}
