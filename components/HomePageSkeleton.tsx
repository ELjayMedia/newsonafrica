import { Skeleton } from "@/components/ui/skeleton"
import { memo } from "react"

// Using memo to prevent unnecessary re-renders
export const HomePageSkeleton = memo(function HomePageSkeleton() {
  // Create an array of delays for staggered animation effect
  const getStaggeredDelay = (index: number, baseDelay = 100) => index * baseDelay

  return (
    <div className="space-y-6">
      {/* Featured Hero Skeleton - optimized structure */}
      <section className="bg-gray-50 px-2 py-1 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <Skeleton className="w-full md:w-3/5 aspect-[16/9]" animation="shimmer" />
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-4 w-1/4" animation="shimmer" delay={getStaggeredDelay(0)} />
            <Skeleton className="h-6 w-full" animation="shimmer" delay={getStaggeredDelay(1)} />
            <Skeleton className="h-4 w-full" animation="shimmer" delay={getStaggeredDelay(2)} />
            <Skeleton className="h-4 w-3/4" animation="shimmer" delay={getStaggeredDelay(3)} />
          </div>
        </div>
      </section>

      {/* Vertical Cards Skeleton - optimized with fewer DOM elements */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex">
            <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <Skeleton className="w-full h-32" animation="shimmer" delay={getStaggeredDelay(i)} />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" animation="shimmer" delay={getStaggeredDelay(i + 3)} />
                <Skeleton className="h-3 w-1/2" animation="shimmer" delay={getStaggeredDelay(i + 6)} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Secondary Stories Skeleton - optimized */}
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden shadow-sm">
              <Skeleton className="w-full aspect-video" animation="shimmer" delay={getStaggeredDelay(i)} />
              <div className="p-2 flex-1 flex flex-col">
                <Skeleton className="h-4 w-3/4 mb-1" animation="shimmer" delay={getStaggeredDelay(i + 3)} />
                <Skeleton className="h-3 w-1/2 mt-auto" animation="shimmer" delay={getStaggeredDelay(i + 6)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Sections Skeleton - optimized with fewer sections */}
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="bg-white p-4 rounded-lg shadow-sm">
          <Skeleton className="h-6 w-1/4 mb-4" animation="shimmer" delay={getStaggeredDelay(sectionIndex * 10)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start bg-white p-2 rounded-lg shadow-sm">
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton
                    className="h-4 w-3/4"
                    animation="shimmer"
                    delay={getStaggeredDelay(sectionIndex * 10 + i)}
                  />
                  <Skeleton
                    className="h-3 w-1/2"
                    animation="shimmer"
                    delay={getStaggeredDelay(sectionIndex * 10 + i + 4)}
                  />
                </div>
                <Skeleton
                  className="w-20 h-20 flex-shrink-0"
                  animation="shimmer"
                  delay={getStaggeredDelay(sectionIndex * 10 + i + 8)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
})
