import { Skeleton } from "@/components/ui/skeleton"

interface HeaderSkeletonProps {
  variant?: "desktop" | "mobile"
}

export function HeaderSkeleton({ variant = "desktop" }: HeaderSkeletonProps) {
  if (variant === "mobile") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-48 md:h-12" />
        <div className="flex flex-1 items-center justify-end gap-4">
          <Skeleton className="hidden h-10 w-48 sm:block" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-5" />
          </div>
          <Skeleton className="hidden h-4 w-24 md:block" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-2 border-t border-border/50 pt-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-24" />
          ))}
        </div>
      </div>
    </div>
  )
}
