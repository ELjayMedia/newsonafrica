import { memo } from 'react';

import { Skeleton } from '@/components/Skeleton';

export const NewsGridSkeleton = memo(function NewsGridSkeleton() {
  // Create an array of delays for staggered animation effect
  const getStaggeredDelay = (index: number, baseDelay = 75) => index * baseDelay;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-stretch justify-between py-2 space-x-4 bg-white border border-gray-200 rounded-lg shadow-sm p-3 min-h-[6rem]"
        >
          <div className="flex flex-col justify-between flex-1 pr-4">
            <Skeleton
              className="h-4 w-3/4 mb-2"
              animation="shimmer"
              delay={getStaggeredDelay(i * 2)}
            />
            <Skeleton
              className="h-3 w-1/2"
              animation="shimmer"
              delay={getStaggeredDelay(i * 2 + 1)}
            />
          </div>
          <Skeleton
            className="w-[62px] h-[62px] flex-shrink-0 self-center"
            animation="shimmer"
            delay={getStaggeredDelay(i * 2 + 2)}
          />
        </div>
      ))}
    </div>
  );
});
