"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe, ChevronRight, MapPin, Search } from "lucide-react"
import { COUNTRIES } from "@/lib/wordpress-api"
import type { CountryPosts } from "@/types/home"
import { Input } from "@/components/ui/input"

export function ElegantCountryNavigation() {
  const [showAll, setShowAll] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const countries = Object.values(COUNTRIES)

  const filteredCountries = countries.filter((country) => country.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const displayedCountries = showAll ? filteredCountries : filteredCountries.slice(0, 8)

  // Group countries by region for better organization
  const regions = {
    "West Africa": ["ng", "gh", "sn", "ci", "cm"],
    "East Africa": ["ke", "et", "tz", "ug", "rw"],
    "Southern Africa": ["za", "sz", "zw", "bw", "zm", "mw", "na", "ao", "mz"],
    "North Africa": ["eg", "ma"],
  }

  return (
    <section className="bg-muted/20 py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="h-8 w-8 text-earth-warm" />
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-earth-dark">Explore Africa</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover news from across the continent with our country-specific editions. Stay connected to the stories
            that matter in every corner of Africa.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Countries Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
          {displayedCountries.map((country) => (
            <Link
              key={country.code}
              href={`/${country.code}`}
              className="group elegant-card p-4 text-center hover:shadow-lg transition-all duration-300"
            >
              <div className="space-y-3">
                <span className="text-3xl block" role="img" aria-label={`${country.name} flag`}>
                  {country.flag}
                </span>
                <div>
                  <h3 className="font-medium text-sm group-hover:text-earth-warm transition-colors">{country.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{country.code.toUpperCase()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Show More/Less Button */}
        {filteredCountries.length > 8 && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="border-earth-warm text-earth-warm hover:bg-earth-warm hover:text-earth-warm-foreground"
            >
              {showAll ? "Show Less" : `Show All ${filteredCountries.length} Countries`}
              <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </Button>
          </div>
        )}

        {/* Regional Breakdown */}
        {showAll && (
          <div className="mt-16 space-y-12">
            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold text-earth-dark mb-2">Countries by Region</h3>
              <div className="w-24 h-0.5 bg-earth-warm mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {Object.entries(regions).map(([regionName, countryCodes]) => (
                <div key={regionName} className="space-y-4">
                  <h4 className="font-semibold text-lg text-earth-dark border-b border-earth-light pb-2">
                    {regionName}
                  </h4>
                  <div className="space-y-2">
                    {countryCodes.map((code) => {
                      const country = COUNTRIES[code]
                      if (!country) return null

                      return (
                        <Link
                          key={code}
                          href={`/${code}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-earth-light/30 transition-colors group"
                        >
                          <span className="text-lg" role="img" aria-label={`${country.name} flag`}>
                            {country.flag}
                          </span>
                          <span className="text-sm font-medium group-hover:text-earth-warm transition-colors">
                            {country.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function ElegantCountrySpotlight({ countryPosts }: { countryPosts: CountryPosts }) {
  const spotlightCountries = Object.entries(countryPosts)
    .filter(([_, posts]) => posts.length > 0)
    .slice(0, 4)

  if (spotlightCountries.length === 0) return null

  return (
    <section className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <MapPin className="h-6 w-6 text-earth-warm" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-earth-dark">Country Spotlight</h2>
        </div>
        <p className="text-muted-foreground">Featured stories from across the continent</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {spotlightCountries.map(([countryCode, posts]) => {
          const country = COUNTRIES[countryCode]
          if (!country || posts.length === 0) return null

          return (
            <div key={countryCode} className="elegant-card p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                <span className="text-2xl" role="img" aria-label={`${country.name} flag`}>
                  {country.flag}
                </span>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-earth-dark">{country.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {posts.length} recent {posts.length === 1 ? "story" : "stories"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {posts.slice(0, 2).map((post) => (
                  <Link key={post.id} href={`/${countryCode}/article/${post.slug}`} className="block group">
                    <h4 className="news-article-title text-sm group-hover:text-earth-warm transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </Link>
                ))}
              </div>

              <Link
                href={`/${countryCode}`}
                className="inline-flex items-center gap-2 text-sm text-earth-warm hover:text-earth-dark font-medium transition-colors"
              >
                View all {country.name} news
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
