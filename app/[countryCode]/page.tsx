import { notFound } from "next/navigation"

import { HomeContent } from "@/components/HomeContent"
import { buildHomeContentPropsForEdition } from "../(home)/home-data"
import { resolveEdition } from "./article/[slug]/article-data"
import { getSiteBaseUrl } from "@/lib/site-url"

// Matches CACHE_DURATIONS.MEDIUM (5 minutes) to align with home feed caching.
export const revalidate = 300

type Props = { params: { countryCode: string } }

export default async function CountryPage({ params }: Props) {
  const { countryCode } = await params
  const edition = resolveEdition(countryCode)

  if (!edition) {
    return notFound()
  }

  const baseUrl = getSiteBaseUrl()
  const { initialPosts, featuredPosts, countryPosts, initialData } =
    await buildHomeContentPropsForEdition(baseUrl, edition)

  return (
    <HomeContent
      initialPosts={initialPosts}
      featuredPosts={featuredPosts}
      countryPosts={countryPosts}
      initialData={initialData}
    />
  )
}
