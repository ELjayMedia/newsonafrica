import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { AfricanHomeContent } from "@/components/AfricanHomeContent"
import { getAggregatedLatestHome, type AggregatedHomeData } from "@/lib/wordpress-api"
import { env } from "@/config/env"
import { CACHE_TAGS } from "@/lib/cache/constants"

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

export const revalidate = 60

export default async function Home() {
  const feedUrl = new URL("/api/home-feed", env.NEXT_PUBLIC_SITE_URL).toString()

  try {
    const response = await fetch(feedUrl, {
      next: { revalidate: 45, tags: [CACHE_TAGS.HOME] },
    })

    if (response.ok) {
      const aggregatedHome = (await response.json()) as AggregatedHomeData
      return <AfricanHomeContent {...aggregatedHome} />
    }

    console.error("[home] Failed to fetch cached home feed", {
      status: response.status,
      statusText: response.statusText,
    })
  } catch (error) {
    console.error("[home] Home feed request failed", error)
  }

  const aggregatedHome = await getAggregatedLatestHome(6)
  return <AfricanHomeContent {...aggregatedHome} />
}
