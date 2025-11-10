import { Skeleton } from "@/components/ui/skeleton"

export function TrendingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[16/9] w-full rounded-lg" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
