import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the article detail page (NOA-90). */
export function ArticleSkeleton() {
  return (
    <Container className="max-w-3xl space-y-6 py-8">
      <div className="space-y-4">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-16 w-full" />
        <div className="flex items-center gap-3 border-y border-border py-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      <Skeleton className="aspect-video w-full rounded-xl" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Container>
  );
}
