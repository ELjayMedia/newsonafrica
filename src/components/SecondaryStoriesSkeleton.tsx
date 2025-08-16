import { Skeleton } from "./Skeleton"

export function SecondaryStoriesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden shadow-sm">
          <Skeleton className="w-full aspect-video" />
          <div className="p-2 flex-1 flex flex-col">
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2 mt-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}
