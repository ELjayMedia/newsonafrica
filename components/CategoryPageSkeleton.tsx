import { Skeleton } from "@/components/Skeleton"
import { memo } from "react"

export const CategoryPageSkeleton = memo(function CategoryPageSkeleton() {
  // Create an array of delays for staggered animation effect
  const getStaggeredDelay = (index: number, baseDelay = 75) => index * baseDelay

  return (
    <div className="space-y-8 px-4 py-4 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-1/3 mb-4" animation="shimmer" />
      <Skeleton className="h-4 w-2/3 mb-8" animation="shimmer" delay={getStaggeredDelay(1)} />

      {/* Featured posts grid - reduced number of items for better performance */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Skeleton className="w-full aspect-[16/9]" animation="shimmer" delay={getStaggeredDelay(i + 2)} />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" animation="shimmer" delay={getStaggeredDelay(i + 8)} />
              <Skeleton className="h-4 w-full" animation="shimmer" delay={getStaggeredDelay(i + 14)} />
              <Skeleton className="h-4 w-1/2" animation="shimmer" delay={getStaggeredDelay(i + 20)} />
            </div>
          </div>
        ))}
      </div>

      {/* Ad placeholder */}
      <Skeleton className="w-full h-20 my-8" animation="shimmer" delay={getStaggeredDelay(26)} />

      {/* More posts section - reduced number of items */}
      <Skeleton className="h-6 w-1/4 mb-4" animation="shimmer" delay={getStaggeredDelay(27)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
            <div className="flex-1 space-y-2 mr-3">
              <Skeleton className="h-4 w-3/4" animation="shimmer" delay={getStaggeredDelay(i + 28)} />
              <Skeleton className="h-3 w-1/2" animation="shimmer" delay={getStaggeredDelay(i + 32)} />
            </div>
            <Skeleton className="w-20 h-20 flex-shrink-0" animation="shimmer" delay={getStaggeredDelay(i + 36)} />
          </div>
        ))}
      </div>
    </div>
  )
})
