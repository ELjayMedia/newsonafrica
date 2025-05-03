import { Skeleton } from "@/components/ui/skeleton"

export function PostSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-1 sm:px-2 md:px-4 animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center space-x-2 mb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>

      {/* Featured image skeleton */}
      <Skeleton className="w-full aspect-[16/9] mb-6" />

      {/* Content skeleton */}
      <div className="space-y-4 mb-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />

        {/* Ad skeleton */}
        <Skeleton className="h-[250px] w-full my-6" />

        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        {/* Ad skeleton */}
        <Skeleton className="h-[250px] w-full my-6" />

        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Footer skeleton */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between">
          <div className="space-y-2 mb-4 sm:mb-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>

      {/* Comments section skeleton */}
      <div className="mt-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
