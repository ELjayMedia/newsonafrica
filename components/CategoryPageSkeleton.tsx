import { memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export const CategoryPageSkeleton = memo(function CategoryPageSkeleton() {
  return (
    <div className="space-y-8 px-4 py-4 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-1/3 mb-4 mx-auto" />
      <Skeleton className="h-4 w-2/3 mb-8 mx-auto" />

      {/* Related categories skeleton */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Featured posts grid - reduced number of items for better performance */}
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Skeleton className="w-full aspect-[16/9]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Ad placeholder */}
      <Skeleton className="w-full h-20 my-8" />

      {/* More posts section - reduced number of items */}
      <Skeleton className="h-6 w-1/4 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
            <div className="flex-1 space-y-2 mr-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-20 h-20 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
})

export default CategoryPageSkeleton
