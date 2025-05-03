import { Skeleton } from "@/components/ui/skeleton"

export function SidebarSkeleton() {
  return (
    <div className="w-full md:w-80 space-y-8">
      <div className="bg-white shadow-md rounded-lg p-4">
        <Skeleton className="h-6 w-1/2 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 mb-4">
            <Skeleton className="w-6 h-6" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Ad skeleton */}
      <Skeleton className="h-[600px] w-full" />

      <div className="bg-white shadow-md rounded-lg p-4">
        <Skeleton className="h-6 w-1/2 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-2 mb-4">
            <Skeleton className="w-16 h-16" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
