import { FeaturedHero } from "@/components/FeaturedHero"

import type { AggregatedHomeData } from "./home-data"

interface HeroSectionProps {
  data: AggregatedHomeData
}

export function HeroSection({ data }: HeroSectionProps) {
  const { heroPost } = data

  if (!heroPost) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        We couldn&apos;t load the top story right now. Please check back soon.
      </div>
    )
  }

  return <FeaturedHero post={heroPost} />
}
