import { Card, CardContent, CardFooter } from "@/components/ui/card"

export function BookmarksSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden flex flex-col h-full animate-pulse">
          <div className="relative">
            <div className="aspect-video relative overflow-hidden bg-gray-200"></div>
          </div>
          <CardContent className="flex-grow pt-4">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </CardContent>
          <CardFooter className="pt-0 text-sm text-gray-500">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
