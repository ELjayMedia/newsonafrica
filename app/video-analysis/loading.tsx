import { Skeleton } from "@/components/ui/skeleton"

export default function VideoAnalysisLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-1/3 mb-6" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-8" />

      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-4 w-2/3 mb-6" />

          {/* File upload area */}
          <Skeleton className="h-40 w-full mb-6 rounded-lg" />

          {/* Button */}
          <div className="flex justify-center">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </div>
  )
}
