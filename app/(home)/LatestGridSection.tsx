import { NewsGrid } from "@/components/NewsGrid"

import { fetchAggregatedHome } from "./home-data"

interface LatestGridSectionProps {
  baseUrl: string
  cacheTags: string[]
}

export async function LatestGridSection({
  baseUrl,
  cacheTags,
}: LatestGridSectionProps) {
  const { remainingPosts } = await fetchAggregatedHome(baseUrl, cacheTags)

  if (!remainingPosts.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        More stories will appear here as soon as they&apos;re available.
      </div>
    )
  }

  return <NewsGrid posts={remainingPosts} className="pt-2" />
}
