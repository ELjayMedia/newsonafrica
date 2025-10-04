import type { Metadata } from "next"
import { headers } from "next/headers"
import { Suspense } from "react"

import { siteConfig } from "@/config/site"
import { buildCacheTags } from "@/lib/cache/tag-utils"

import { HeroSection } from "./(home)/HeroSection"
import { TrendingSection } from "./(home)/TrendingSection"
import { LatestGridSection } from "./(home)/LatestGridSection"
import { HeroSkeleton } from "./(home)/HeroSkeleton"
import { TrendingSkeleton } from "./(home)/TrendingSkeleton"
import { LatestGridSkeleton } from "./(home)/LatestGridSkeleton"

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: "African News, News On Africa, Latest News, Breaking News, African Politics, Business News",

  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-US": siteConfig.url,
      en: siteConfig.url,
    },
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    bingBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },

  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@newsonafrica",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${siteConfig.url}/og-image.jpg`],
  },

  other: {
    "og:site_name": "News On Africa",
    "og:locale": "en_US",
  },
}

export const experimental_ppr = true

export const revalidate = 60

export default async function Home() {
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const protocolHeader = headerList.get("x-forwarded-proto")
  const protocol = protocolHeader ?? (host?.includes("localhost") ? "http" : "https")
  const baseUrl = host ? `${protocol}://${host}` : siteConfig.url
  const cacheTags = buildCacheTags({ country: "all", section: "home" })

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Latest coverage
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          News across Africa
        </h1>
      </header>

      <section aria-labelledby="home-top-story-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="home-top-story-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Top story
          </h2>
        </div>
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSection baseUrl={baseUrl} cacheTags={cacheTags} />
        </Suspense>
      </section>

      <section aria-labelledby="home-trending-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="home-trending-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Trending now
          </h2>
        </div>
        <Suspense fallback={<TrendingSkeleton />}>
          <TrendingSection baseUrl={baseUrl} cacheTags={cacheTags} />
        </Suspense>
      </section>

      <section aria-labelledby="home-latest-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="home-latest-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Latest from across the continent
          </h2>
        </div>
        <Suspense fallback={<LatestGridSkeleton />}>
          <LatestGridSection baseUrl={baseUrl} cacheTags={cacheTags} />
        </Suspense>
      </section>
    </div>
  )
}
