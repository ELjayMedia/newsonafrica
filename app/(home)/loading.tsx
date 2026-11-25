import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the pan-African home (NOA-21). The home fans out a
 * WordPress feed request per edition, so a route-level skeleton avoids a blank
 * frame while those resolve. Mirrors the hero + story grid + rail layout.
 *
 * Scoped to the `(home)` route group on purpose: a root `app/loading.tsx`
 * wraps every route (including `/[countryCode]`) in a streaming Suspense
 * boundary, which flushes a 200 shell before `notFound()` in the country
 * layout can set a 404 — regressing unknown-edition pages from 404 to 200.
 * Keeping the boundary inside `(home)` limits it to the `/` home page.
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
                <Skeleton className="aspect-video w-full rounded-media" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest-across grid + rail */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-[12px]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-media" />
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
