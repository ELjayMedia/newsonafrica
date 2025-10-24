"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, ChevronRight, MapPin } from "lucide-react"
import { COUNTRIES } from "@/lib/wordpress/client"
import type { CountryPosts } from "@/types/home"
import { getCurrentCountry } from "@/lib/utils/routing"

export function CountryNavigation() {
  const [showAll, setShowAll] = useState(false)
  const countries = Object.values(COUNTRIES)
  const displayedCountries = showAll ? countries : countries.slice(0, 6)

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Explore Africa
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Discover news from across the continent with our country-specific editions
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {displayedCountries.map((country) => (
            <Link
              key={country.code}
              href={`/${country.code}`}
              className="group flex flex-col items-center p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            >
              <span className="text-2xl mb-1" role="img" aria-label={`${country.name} flag`}>
                {country.flag}
              </span>
              <span className="text-xs font-medium text-center group-hover:text-primary transition-colors">
                {country.name}
              </span>
            </Link>
          ))}
        </div>

        {countries.length > 6 && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-primary hover:text-primary/80"
            >
              {showAll ? "Show Less" : `Show All ${countries.length} Countries`}
              <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CountrySpotlight({ countryPosts = {} }: { countryPosts?: CountryPosts }) {
  const currentCountry = getCurrentCountry()

  const spotlightCountries = useMemo(
    () =>
      Object.entries(countryPosts)
        .filter(([countryCode, posts]) => countryCode !== currentCountry && posts && posts.length > 0)
        .slice(0, 3),
    [countryPosts, currentCountry],
  )

  if (spotlightCountries.length === 0) return null

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Pan-African Spotlight</h2>
        <Badge variant="secondary" className="ml-2">
          Pan-African
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">Discover the latest stories from across the African continent</p>

      <div className="flex overflow-x-auto gap-6 pb-4 scroll-smooth snap-x snap-mandatory">
        {spotlightCountries.map(([countryCode, posts]) => {
          const country = COUNTRIES[countryCode]
          if (!country || !posts || posts.length === 0) return null

          return (
            <Card
              key={countryCode}
              className="flex-none w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[300px] overflow-hidden hover:shadow-lg transition-shadow snap-start"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-label={`${country.name} flag`}>
                    {country.flag}
                  </span>
                  <CardTitle className="text-lg">{country.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {posts.slice(0, 2).map((post) => (
                  <Link key={post.id} href={`/${countryCode}/article/${post.slug}`} className="block group">
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(post.date).toLocaleDateString()}</p>
                  </Link>
                ))}
                <Link
                  href={`/${countryCode}`}
                  className="inline-flex items-center text-sm text-primary hover:text-primary/80 font-medium"
                >
                  View all {country.name} news
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
