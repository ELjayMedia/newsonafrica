import { Skeleton } from "@/components/Skeleton"
import { memo } from "react"

export const CategoryPageSkeleton = memo(function CategoryPageSkeleton() {
  const getDelay = (index: number) => index * 50

  return (
    <div className="space-y-8 px-4 py-4 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-1/3 mb-4 mx-auto" animation="shimmer" />
      <Skeleton className="h-4 w-2/3 mb-8 mx-auto" animation="shimmer" delay={getDelay(1)} />

      {/* Related categories skeleton */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" animation="shimmer" delay={getDelay(i + 2)} />
        ))}
      </div>

      {/* Featured posts grid - optimized for performance */}
      <Skeleton className="h-8 w-48 mb-6" animation="shimmer" delay={getDelay(6)} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Skeleton className="w-full aspect-[16/9]" animation="shimmer" delay={getDelay(i + 7)} />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" animation="shimmer" delay={getDelay(i + 13)} />
              <Skeleton className="h-4 w-full" animation="shimmer" delay={getDelay(i + 19)} />
              <Skeleton className="h-4 w-1/2" animation="shimmer" delay={getDelay(i + 25)} />
            </div>
          </div>
        ))}
      </div>

      {/* Ad placeholder */}
      <Skeleton className="w-full h-20 my-8" animation="shimmer" delay={getDelay(31)} />

      {/* More posts section - optimized */}
      <Skeleton className="h-6 w-1/4 mb-4" animation="shimmer" delay={getDelay(32)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
            <div className="flex-1 space-y-2 mr-3">
              <Skeleton className="h-4 w-3/4" animation="shimmer" delay={getDelay(i + 33)} />
              <Skeleton className="h-3 w-1/2" animation="shimmer" delay={getDelay(i + 37)} />
            </div>
            <Skeleton className="w-20 h-20 flex-shrink-0" animation="shimmer" delay={getDelay(i + 41)} />
          </div>
        ))}
      </div>
    </div>
  )
})

export default CategoryPageSkeleton
