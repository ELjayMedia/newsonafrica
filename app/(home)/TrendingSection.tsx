import { SecondaryStories } from "@/components/SecondaryStories"

import type { AggregatedHomeData } from "./home-data"

interface TrendingSectionProps {
  data: AggregatedHomeData
}

export function TrendingSection({ data }: TrendingSectionProps) {
  const { secondaryPosts } = data

  if (!secondaryPosts.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        Trending stories are unavailable at the moment. Refresh to try again.
      </div>
    )
  }

  return <SecondaryStories posts={secondaryPosts} layout="horizontal" />
}
