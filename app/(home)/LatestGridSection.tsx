import { NewsGrid } from "@/components/NewsGrid"

import type { AggregatedHomeData } from "./home-data"

interface LatestGridSectionProps {
  data: AggregatedHomeData
}

export function LatestGridSection({ data }: LatestGridSectionProps) {
  const { remainingPosts } = data

  if (!remainingPosts.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        More stories will appear here as soon as they&apos;re available.
      </div>
    )
  }

  return <NewsGrid posts={remainingPosts} className="pt-2" />
}
