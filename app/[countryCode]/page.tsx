import { notFound } from "next/navigation"

import { HeroSection } from "../(home)/HeroSection"
import { LatestGridSection } from "../(home)/LatestGridSection"
import { TrendingSection } from "../(home)/TrendingSection"
import { fetchAggregatedHomeForCountry } from "../(home)/home-data"
import { isSupportedCountry } from "@/lib/wp"

export const dynamic = "force-static"
export const revalidate = 60

type Props = { params: { countryCode: string } }

export default async function CountryPage({ params }: Props) {
  const { countryCode } = params

  if (!isSupportedCountry(countryCode)) {
    return notFound()
  }

  const aggregatedHome = await fetchAggregatedHomeForCountry(countryCode)

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
