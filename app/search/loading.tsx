import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the search results page (NOA-94). */
export default function SearchLoading() {
  return (
    <Container className="space-y-8 py-8">
      <div className="space-y-4 border-b border-border pb-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex gap-4 border-b border-border pb-6 sm:gap-6">
            <Skeleton className="aspect-[4/3] w-28 flex-shrink-0 rounded-media sm:w-40 md:w-48" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
