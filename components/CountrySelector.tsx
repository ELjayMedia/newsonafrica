"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AFRICAN_EDITION, SUPPORTED_COUNTRIES, SUPPORTED_EDITIONS } from "@/lib/editions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export default function CountrySelector() {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedEdition, setSelectedEdition] = useState<string>(AFRICAN_EDITION.code)

  useEffect(() => {
    if (!pathname) {
      setSelectedEdition(AFRICAN_EDITION.code)
      return
    }

    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) {
      setSelectedEdition(AFRICAN_EDITION.code)
      return
    }

    const [potentialCountry] = segments
    const normalized = potentialCountry.toLowerCase()
    const countryMatch = SUPPORTED_COUNTRIES.find((country) => country.code === normalized)

    if (countryMatch) {
      setSelectedEdition(countryMatch.code)
      return
    }

    setSelectedEdition(AFRICAN_EDITION.code)
  }, [pathname])

  const currentEdition = useMemo(() => {
    return SUPPORTED_EDITIONS.find((edition) => edition.code === selectedEdition) ?? AFRICAN_EDITION
  }, [selectedEdition])

  const handleChange = (value: string) => {
    setSelectedEdition(value)

    if (value === AFRICAN_EDITION.code) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("preferredCountry")
        document.cookie = "preferredCountry=; path=/; max-age=0"
      }
      router.push("/")
      return
    }

    const country = SUPPORTED_COUNTRIES.find((entry) => entry.code === value)
    if (!country) {
      router.push("/")
      return
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("preferredCountry", country.code)
      document.cookie = `preferredCountry=${country.code}; path=/; max-age=${60 * 60 * 24 * 365}`
    }

    router.push(`/${country.code}`)
  }

  return (
    <Select value={selectedEdition} onValueChange={handleChange}>
      <SelectTrigger className="w-auto gap-2 border-none focus:ring-0">
        <div className="flex items-center">
          <span className="text-xl" role="img" aria-label={`${currentEdition.name} flag`}>
            {currentEdition.flag}
          </span>
          <span className="ml-2 hidden sm:inline">{currentEdition.name}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_EDITIONS.map((edition) => (
          <SelectItem key={edition.code} value={edition.code}>
            <span className="flex items-center">
              <span className="mr-2" role="img" aria-label={`${edition.name} flag`}>
                {edition.flag}
              </span>
              <span className="hidden sm:inline">{edition.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
