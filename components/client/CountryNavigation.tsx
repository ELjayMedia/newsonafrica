"use client"

import { useState } from "react"
import Link from "next/link"
import { Globe, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRIES } from "@/lib/wordpress/client"

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

export default CountryNavigation
