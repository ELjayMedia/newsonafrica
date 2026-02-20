import { Skeleton } from "@/components/Skeleton"
import { memo } from "react"

export const ArticleSkeleton = memo(function ArticleSkeleton() {
  const getStaggeredDelay = (index: number, baseDelay = 50) => index * baseDelay

  return (
    <div className="max-w-3xl mx-auto px-1 sm:px-2 md:px-4">
      <div className="flex items-center space-x-2 mb-6">
        <Skeleton className="h-4 w-20" animation="shimmer" />
        <Skeleton className="h-4 w-4" animation="shimmer" delay={getStaggeredDelay(1)} />
        <Skeleton className="h-4 w-32" animation="shimmer" delay={getStaggeredDelay(2)} />
      </div>

      <div className="mb-8">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-4 w-24" animation="shimmer" delay={getStaggeredDelay(3)} />
          <Skeleton className="h-4 w-16" animation="shimmer" delay={getStaggeredDelay(4)} />
        </div>
        <Skeleton className="h-8 w-full mb-4" animation="shimmer" delay={getStaggeredDelay(5)} />
        <Skeleton className="h-8 w-3/4 mb-4" animation="shimmer" delay={getStaggeredDelay(6)} />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" animation="shimmer" delay={getStaggeredDelay(7)} />
          <Skeleton className="h-4 w-8" animation="shimmer" delay={getStaggeredDelay(8)} />
        </div>
      </div>

      <Skeleton className="w-full aspect-[16/9] mb-6" animation="shimmer" delay={getStaggeredDelay(9)} />

      <div className="space-y-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" animation="shimmer" delay={getStaggeredDelay(i + 10)} />
        ))}
        <Skeleton className="h-4 w-3/4" animation="shimmer" delay={getStaggeredDelay(13)} />

        <Skeleton className="h-[250px] w-full my-6" animation="shimmer" delay={getStaggeredDelay(14)} />

        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" animation="shimmer" delay={getStaggeredDelay(i + 15)} />
        ))}
        <Skeleton className="h-4 w-2/3" animation="shimmer" delay={getStaggeredDelay(17)} />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between">
          <div className="space-y-2 mb-4 sm:mb-0">
            <Skeleton className="h-4 w-40" animation="shimmer" delay={getStaggeredDelay(18)} />
            <Skeleton className="h-4 w-32" animation="shimmer" delay={getStaggeredDelay(19)} />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16" animation="shimmer" delay={getStaggeredDelay(20)} />
            <Skeleton className="h-6 w-16" animation="shimmer" delay={getStaggeredDelay(21)} />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Skeleton className="h-6 w-40 mb-4" animation="shimmer" delay={getStaggeredDelay(22)} />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-32" animation="shimmer" delay={getStaggeredDelay(i * 3 + 23)} />
                <Skeleton className="h-4 w-16" animation="shimmer" delay={getStaggeredDelay(i * 3 + 24)} />
              </div>
              <Skeleton className="h-4 w-full mb-1" animation="shimmer" delay={getStaggeredDelay(i * 3 + 25)} />
              <Skeleton className="h-4 w-5/6" animation="shimmer" delay={getStaggeredDelay(i * 3 + 26)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
