import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function ArticleSkeleton() {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-muted/30 via-background to-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/15 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6 rounded-3xl border border-border/60 bg-background/80 p-4 shadow-lg ring-1 ring-border/30 sm:p-6 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="space-y-4">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-12 w-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>

            <Skeleton className="h-64 w-full rounded-2xl" />

            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={`paragraph-${index}`} className="h-4 w-full" />
              ))}
              <Skeleton className="h-4 w-1/2" />
            </div>

            <div className="border-t border-border/80 pt-8">
              <Skeleton className="h-7 w-48 mb-6" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`related-${index}`} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-3/4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`meta-${index}`} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-2/3" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`takeaway-${index}`} className="flex items-center gap-3">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
