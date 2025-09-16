import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { COUNTRIES } from "@/lib/wordpress-api"
import { CountryEditionContent } from "./CountryEditionContent"
import { CountryEditionSkeleton } from "./CountryEditionSkeleton"
import * as log from "@/lib/log"

interface CountryPageProps {
  params: {
    countryCode: string
  }
  searchParams?: Record<string, string | string[] | undefined>
}

export const revalidate = 300

// Generate static params for all supported countries
export async function generateStaticParams(): Promise<{ countryCode: string }[]> {
  try {
    return Object.keys(COUNTRIES).map((countryCode) => ({
      countryCode,
    }))
  } catch (error) {
    log.error("generateStaticParams for country page failed", { error })
    return []
  }
}

// Generate metadata for each country
export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { countryCode } = params
  const country = COUNTRIES[countryCode]

  if (!country) {
    return {
      title: "Country Not Found - News On Africa",
      description: "The requested country edition was not found.",
    }
  }

  return {
    title: `${country.name} News - News On Africa`,
    description: `Latest news, trending stories, and breaking updates from ${country.name}. Stay informed with News On Africa's ${country.name} edition.`,
    keywords: [`${country.name} news`, "African news", "breaking news", country.name, "News On Africa"],
    openGraph: {
      title: `${country.name} News - News On Africa`,
      description: `Latest news and updates from ${country.name}`,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${country.name} News - News On Africa`,
      description: `Latest news and updates from ${country.name}`,
    },
    alternates: {
      canonical: `/${countryCode}`,
    },
  }
}

export default function CountryPage({ params }: CountryPageProps) {
  const { countryCode } = params

  // Check if country code is valid
  if (!COUNTRIES[countryCode]) {
    notFound()
  }

  const country = COUNTRIES[countryCode]

  return (
    <div className="min-h-screen bg-background">
      {/* Country Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label={`${country.name} flag`}>
              {country.flag}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{country.name} Edition</h1>
              <p className="text-sm text-muted-foreground">Latest news and updates from {country.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Suspense fallback={<CountryEditionSkeleton />}>
        <CountryEditionContent countryCode={countryCode} country={country} />
      </Suspense>
    </div>
  )
}
