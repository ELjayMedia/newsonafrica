import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function BookmarksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <CardContent className="pt-4">
              <Skeleton className="h-7 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
            <CardFooter className="pt-0">
              <Skeleton className="h-4 w-20" />
            </CardFooter>
          </Card>
        ))}
    </div>
  )
}
