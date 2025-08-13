import { Skeleton } from '@/components/ui/skeleton';

export function SearchPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Search box skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Results count skeleton */}
      <Skeleton className="h-5 w-48" />

      {/* Results skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2 border-b border-gray-200 pb-6">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}

      {/* Load more button skeleton */}
      <div className="flex justify-center pt-4">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
