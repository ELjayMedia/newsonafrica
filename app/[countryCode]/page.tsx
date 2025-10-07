import { notFound } from "next/navigation"

import { HeroSection } from "../(home)/HeroSection"
import { LatestGridSection } from "../(home)/LatestGridSection"
import { TrendingSection } from "../(home)/TrendingSection"
import {
  fetchAggregatedHome,
  fetchAggregatedHomeForCountry,
  HOME_FEED_CACHE_TAGS,
} from "../(home)/home-data"
import { AFRICAN_EDITION, isCountryEdition, SUPPORTED_EDITIONS } from "@/lib/editions"
import { getSiteBaseUrl } from "@/lib/site-url"

export const dynamic = "force-static"
export const revalidate = 60

type Props = { params: { countryCode: string } }

export default async function CountryPage({ params }: Props) {
  const slug = params.countryCode.toLowerCase()
  const edition = SUPPORTED_EDITIONS.find(({ code }) => code === slug)

  if (!edition) {
    return notFound()
  }

  const aggregatedHome = edition === AFRICAN_EDITION
    ? await fetchAggregatedHome(getSiteBaseUrl(), HOME_FEED_CACHE_TAGS)
    : isCountryEdition(edition)
      ? await fetchAggregatedHomeForCountry(edition.code)
      : notFound()

  return (
    <main className="container mx-auto space-y-12 px-4 py-8">
      <section>
        <HeroSection data={aggregatedHome} />
      </section>

      <section>
        <TrendingSection data={aggregatedHome} />
      </section>

      <section>
        <LatestGridSection data={aggregatedHome} />
      </section>
    </main>
  )
}
