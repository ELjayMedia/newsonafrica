import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the pan-African home (NOA-21). The home fans out a
 * WordPress feed request per edition, so a route-level skeleton avoids a blank
 * frame while those resolve. Mirrors the hero + story grid + rail layout.
 */
export default function HomeLoading() {
  return (
    <Container className="space-y-10 py-8" aria-busy="true" aria-label="Loading the latest news">
      {/* Hero lead + two secondary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <Skeleton className="aspect-video w-full rounded-xl md:h-80" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest-across grid + rail */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </Container>
  );
}
