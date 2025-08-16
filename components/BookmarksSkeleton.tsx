import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function BookmarksSkeleton() {
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="h-10 bg-gray-200 rounded flex-grow"></div>
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>

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
            <CardFooter className="pt-0 text-sm text-gray-500 flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
