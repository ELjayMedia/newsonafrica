export function SearchPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Search box skeleton */}
      <div className="h-12 bg-gray-200 rounded-lg w-full"></div>

      {/* Results count skeleton */}
      <div className="h-5 bg-gray-200 rounded w-48"></div>

      {/* Results skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2 border-b border-gray-200 pb-6">
          <div className="h-7 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}

      {/* Load more button skeleton */}
      <div className="flex justify-center pt-4">
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  )
}
