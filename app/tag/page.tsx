import { fetchAllTags } from "@/lib/wp-server/tags"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import Link from "next/link"
import type { Metadata } from "next"

export const runtime = "nodejs"
const TAGS_PAGE_REVALIDATE = CACHE_DURATIONS.MEDIUM
export const revalidate = TAGS_PAGE_REVALIDATE

export const metadata: Metadata = {
  title: "All Tags - News On Africa",
  description: "Browse all tags on News On Africa",
}

export default async function TagsPage() {
  const tags = await fetchAllTags()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">All Tags</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
          >
            <h2 className="text-lg font-semibold">{tag.name}</h2>
            <p className="text-sm text-gray-600">{tag.count} posts</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
