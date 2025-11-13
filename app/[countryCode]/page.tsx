import { notFound } from "next/navigation"

import { HomeContent } from "@/components/HomeContent"
import { getHomeContentSnapshotForEdition } from "../(home)/home-data"
import { resolveEdition } from "./article/[slug]/article-data"
import { getSiteBaseUrl } from "@/lib/site-url"

export const dynamic = "force-static"
export const revalidate = false

type Props = { params: { countryCode: string } }

export default async function CountryPage({ params }: Props) {
  const { countryCode } = await params
  const edition = resolveEdition(countryCode)

  if (!edition) {
    return notFound()
  }

  const baseUrl = getSiteBaseUrl()
  const homeContent = await getHomeContentSnapshotForEdition(baseUrl, edition)

  return <HomeContent {...homeContent} currentCountry={edition.code} />
}
