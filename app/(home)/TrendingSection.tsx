import { SecondaryStories } from "@/components/SecondaryStories"

import { fetchAggregatedHome } from "./home-data"

interface TrendingSectionProps {
  baseUrl: string
  cacheTags: string[]
}

export async function TrendingSection({ baseUrl, cacheTags }: TrendingSectionProps) {
  const { secondaryPosts } = await fetchAggregatedHome(baseUrl, cacheTags)

  if (!secondaryPosts.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        Trending stories are unavailable at the moment. Refresh to try again.
      </div>
    )
  }

  return <SecondaryStories posts={secondaryPosts} layout="horizontal" />
}
