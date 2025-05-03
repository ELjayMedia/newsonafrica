import { Skeleton } from "@/components/ui/skeleton"

export function SearchPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-1/3 mb-6" />

      {/* Search form skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Skeleton className="h-10 flex-grow" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Search results skeleton */}
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
            <div className="flex-1 space-y-2 mr-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="w-20 h-20 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Load more button skeleton */}
      <div className="flex justify-center mt-8">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
