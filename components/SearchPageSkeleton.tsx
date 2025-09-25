import { Skeleton } from "@/components/Skeleton"

export function SearchPageSkeleton() {
  const getDelay = (index: number) => index * 75

  return (
    <div className="space-y-8">
      {/* Search box skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" animation="shimmer" />

      {/* Results count skeleton */}
      <Skeleton className="h-5 w-48" animation="shimmer" delay={getDelay(1)} />

      {/* Results skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2 border-b border-gray-200 pb-6">
          <Skeleton className="h-7 w-3/4" animation="shimmer" delay={getDelay(i * 5 + 2)} />
          <Skeleton className="h-4 w-1/4" animation="shimmer" delay={getDelay(i * 5 + 3)} />
          <Skeleton className="h-4 w-full" animation="shimmer" delay={getDelay(i * 5 + 4)} />
          <Skeleton className="h-4 w-full" animation="shimmer" delay={getDelay(i * 5 + 5)} />
          <Skeleton className="h-4 w-2/3" animation="shimmer" delay={getDelay(i * 5 + 6)} />
        </div>
      ))}

      {/* Load more button skeleton */}
      <div className="flex justify-center pt-4">
        <Skeleton className="h-10 w-32" animation="shimmer" delay={getDelay(32)} />
      </div>
    </div>
  )
}
