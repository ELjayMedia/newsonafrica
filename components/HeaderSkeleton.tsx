import { Skeleton } from "@/components/ui/skeleton"

export function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-48 md:h-12" />
        <div className="flex flex-1 items-center justify-end gap-4">
          <Skeleton className="hidden sm:block h-10 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-5" />
          </div>
          <Skeleton className="hidden md:block h-4 w-24" />
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
