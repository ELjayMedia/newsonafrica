import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ENV } from "@/config/env"
import { HomeContent } from "@/components/HomeContent"
import { buildHomeContentPropsForEdition } from "../(home)/home-data"
import { resolveEdition } from "./article/[slug]/article-data"
import { getSiteBaseUrl } from "@/lib/site-url"
import { isAfricanEdition } from "@/lib/editions"

// Matches CACHE_DURATIONS.MEDIUM (5 minutes) to align with home feed caching.
export const revalidate = 300

type Props = { params: { countryCode: string } }

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "")

const buildEditionCanonicalUrl = (baseUrl: string, countryCode: string, isAfrican: boolean) =>
  isAfrican ? baseUrl : `${baseUrl}/${countryCode}`

const fallbackMetadata = (countryCode: string, canonicalBase: string): Metadata => {
  const fallbackCanonical = `${canonicalBase}/${countryCode}`
  return {
    title: "Edition Not Found - News On Africa",
    description: "The requested edition could not be found.",
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: fallbackCanonical,
    },
  }
}

export async function generateMetadata({ params }: { params: Promise<{ countryCode: string }> }): Promise<Metadata> {
  const { countryCode } = await params
  const edition = resolveEdition(countryCode)
  const baseUrl = normalizeBaseUrl(ENV.NEXT_PUBLIC_SITE_URL)

  if (!edition || isAfricanEdition(edition)) {
    return fallbackMetadata(countryCode, baseUrl)
  }

  const canonicalUrl = buildEditionCanonicalUrl(baseUrl, edition.code, false)
  const title = `${edition.name} News & Headlines - News On Africa`
  const description = `Top stories, politics, business, and culture updates curated for ${edition.name}. Follow the News On Africa ${edition.name} edition for trusted reporting.`
  const locale = edition.hreflang.replace("-", "_")

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        [edition.hreflang]: canonicalUrl,
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      siteName: "News On Africa",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

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
