"use client"

import { FeaturedHero, type FeaturedHeroProps } from "../FeaturedHero"

export function FeaturedHeroClient(props: FeaturedHeroProps) {
  return <FeaturedHero {...props} />
}
