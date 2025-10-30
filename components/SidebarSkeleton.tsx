import { Skeleton } from "@/components/ui/skeleton"

export function SidebarSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Most Read Skeleton */}
      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b-2 border-gray-200">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-28" />
        </div>
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
      </div>

      {/* Latest News Skeleton */}
      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
        <div className="mb-5 pb-3 border-b-2 border-gray-200">
          <Skeleton className="h-6 w-32" />
        </div>
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
      </div>
    </div>
  )
}
