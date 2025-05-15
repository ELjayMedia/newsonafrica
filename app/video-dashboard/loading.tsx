import { Skeleton } from "@/components/ui/skeleton"

export default function VideoDashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-1/3 mb-6" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-8" />

      <div className="space-y-12">
        <section>
          <Skeleton className="h-8 w-1/4 mb-4" />
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-1/5" />
            </div>

            {/* Chart area */}
            <Skeleton className="h-[400px] w-full mb-6" />

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-1" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <Skeleton className="h-8 w-1/4 mb-4" />
          <div className="bg-white rounded-lg shadow-md p-6">
            <Skeleton className="h-6 w-1/3 mb-4" />
            <Skeleton className="h-4 w-2/3 mb-6" />

            {/* File upload area */}
            <Skeleton className="h-40 w-full mb-6 rounded-lg" />

            {/* Button */}
            <div className="flex justify-center">
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
