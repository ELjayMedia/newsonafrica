import { FeaturedHero } from "@/components/FeaturedHero"

import { fetchAggregatedHome } from "./home-data"

interface HeroSectionProps {
  baseUrl: string
  cacheTags: string[]
}

export async function HeroSection({ baseUrl, cacheTags }: HeroSectionProps) {
  const { heroPost } = await fetchAggregatedHome(baseUrl, cacheTags)

  if (!heroPost) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        We couldn&apos;t load the top story right now. Please check back soon.
      </div>
    )
  }

  return <FeaturedHero post={heroPost} />
}
