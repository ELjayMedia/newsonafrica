import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the saved-articles list (NOA-19). */
export default function BookmarksLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading saved articles">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      <ul className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <Card>
              <CardContent className="flex gap-4 p-4">
                <Skeleton className="hidden h-20 w-28 shrink-0 rounded-md sm:block" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
