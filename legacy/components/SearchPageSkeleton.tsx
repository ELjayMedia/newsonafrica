export function SearchPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse" aria-busy="true" aria-label="Loading search results">
      {/* Search box + filters skeleton */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        <div className="h-12 bg-gray-200 rounded-lg w-full" />
        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-12" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-12" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>

      {/* Results panel skeleton */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {/* Results count */}
        <div className="h-5 bg-gray-200 rounded w-48" />

        {/* Result items */}
        <div className="mt-4 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="mt-2 flex gap-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>

        {/* Load more button skeleton */}
        <div className="flex justify-center pt-6">
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
      </div>
    </div>
  )
}
