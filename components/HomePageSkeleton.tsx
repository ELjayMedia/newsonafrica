import { Skeleton } from "@/components/ui/skeleton"

export function HomePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Featured Hero Skeleton */}
      <section className="bg-gray-50 px-2 py-1 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <Skeleton className="w-full md:w-3/5 aspect-[16/9]" />
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </section>

      {/* Vertical Cards Skeleton */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex">
            <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <Skeleton className="w-full h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Secondary Stories Skeleton */}
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </section>

      {/* Category Sections Skeleton */}
      {[...Array(5)].map((_, i) => (
        <section key={i} className="bg-white p-4 rounded-lg shadow-sm">
          <Skeleton className="h-6 w-1/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex gap-3 items-start bg-white p-2 rounded-lg shadow-sm">
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="w-20 h-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
