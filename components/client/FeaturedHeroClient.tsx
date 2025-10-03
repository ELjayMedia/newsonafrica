"use client"

import { FeaturedHeroContent, type FeaturedHeroProps } from "../featured/FeaturedHeroContent"

export function FeaturedHeroClient(props: FeaturedHeroProps) {
  return <FeaturedHeroContent {...props} />
}
