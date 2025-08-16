import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"

export default function Loading() {
  return (
    <div className="space-y-8">
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">Latest News</h1>
        <NewsGridSkeleton />
      </section>
    </div>
  )
}
