import Link from "next/link"
import { ChevronRight, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRIES } from "@/lib/wordpress/client"
import type { CountryPosts } from "@/types/home"

interface CountrySpotlightProps {
  countryPosts?: CountryPosts
  currentCountry: string
  maxCountries?: number
}

const DEFAULT_MAX_COUNTRIES = 3

export function CountrySpotlight({
  countryPosts = {},
  currentCountry,
  maxCountries = DEFAULT_MAX_COUNTRIES,
}: CountrySpotlightProps) {
  if (!countryPosts || Object.keys(countryPosts).length === 0) {
    return null
  }

  const spotlightCountries = Object.entries(countryPosts)
    .filter(([countryCode, posts]) => countryCode !== currentCountry && posts && posts.length > 0)
    .slice(0, maxCountries)

  if (spotlightCountries.length === 0) {
    return null
  }

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
          if (!country || posts.length === 0) {
            return null
          }

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
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(post.date).toLocaleDateString()}
                    </p>
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

export default CountrySpotlight
