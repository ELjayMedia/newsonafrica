import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function BookmarksSkeleton() {
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 flex-grow" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden flex flex-col h-full">
            <div className="relative">
              <Skeleton className="aspect-video w-full" />
            </div>
            <CardContent className="flex-grow pt-4 space-y-2">
              <Skeleton className="h-6" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
            </CardContent>
            <CardFooter className="pt-0 text-sm text-gray-500 flex justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
