import { Skeleton } from "./Skeleton"

export function FeaturedHeroSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <Skeleton className="w-full md:w-3/5 aspect-[16/9]" />
      <div className="flex-1 space-y-2 w-full">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
