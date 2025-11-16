import type { Metadata } from "next"

import { ENV } from "@/config/env"
import { HomeContent } from "@/components/HomeContent"
import { getSiteBaseUrl } from "@/lib/site-url"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS } from "@/lib/editions"
import { buildHomeContentProps } from "./home-data"

// Matches CACHE_DURATIONS.MEDIUM (5 minutes) to align with home feed caching.
export const revalidate = 300

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "")

const resolveEditionCanonical = (baseUrl: string, editionCode: string, isAfricanEdition: boolean) =>
  isAfricanEdition ? baseUrl : `${baseUrl}/${editionCode}`

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = normalizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)
  const languages = SUPPORTED_EDITIONS.reduce<Record<string, string>>((acc, edition) => {
    acc[edition.hreflang] = resolveEditionCanonical(baseUrl, edition.code, edition.type === "african")
    return acc
  }, {})

  const title = `News On Africa – ${AFRICAN_EDITION.name}`
  const description =
    "Pan-African headlines, politics, business, and culture stories curated for the African edition of News On Africa."

  return {
    title,
    description,
    alternates: {
      canonical: baseUrl,
      languages,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: baseUrl,
      siteName: "News On Africa",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function Page() {
  const baseUrl = getSiteBaseUrl()
  const { initialPosts, featuredPosts, countryPosts, initialData } =
    await buildHomeContentProps(baseUrl)

  return (
    <HomeContent
      initialPosts={initialPosts}
      featuredPosts={featuredPosts}
      countryPosts={countryPosts}
      initialData={initialData}
    />
  )
}
