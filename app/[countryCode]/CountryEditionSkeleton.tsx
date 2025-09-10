import { Skeleton } from "@/components/ui/skeleton"

export function CountryEditionSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-1 w-8 rounded-full" />
          <Skeleton className="h-8 w-40" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="aspect-video w-full mb-4" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-4">
            <div>
              <Skeleton className="aspect-video w-full mb-2" />
              <Skeleton className="h-6 w-full" />
            </div>
            <div>
              <Skeleton className="aspect-video w-full mb-2" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-video w-full mb-3" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      {/* Categories Rail Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-8 w-40" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
      </section>

      {/* Latest News Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
