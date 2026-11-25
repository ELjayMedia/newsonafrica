import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shared by the category/tag/author listing pages (NOA-91/92). */
export function ListingSkeleton() {
  return (
    <Container className="space-y-8 py-8">
      <div className="space-y-3 border-b border-border pb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="aspect-video w-full rounded-media" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </Container>
  );
}
