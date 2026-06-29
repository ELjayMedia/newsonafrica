import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"

export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>
      <div className="bg-gray-200 h-16 mb-6 rounded-md"></div>
      <div className="space-y-8">
        <section className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
          <NewsGridSkeleton />
        </section>
      </div>
    </div>
  )
}
