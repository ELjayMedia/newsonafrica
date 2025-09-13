"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { COUNTRIES } from "@/lib/wordpress-api"
import { getCurrentCountry } from "@/lib/utils/routing"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export default function CountrySelector() {
  const router = useRouter()
  const [country, setCountry] = useState(() => getCurrentCountry())

  const handleChange = (value: string) => {
    setCountry(value)
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredCountry", value)
      document.cookie = `preferredCountry=${value}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
    router.push(`/${value}`)
  }
  const current = COUNTRIES[country]

  return (
    <Select value={country} onValueChange={handleChange}>
      <SelectTrigger className="w-auto gap-2 border-none focus:ring-0">
        {current && (
          <div className="flex items-center">
            <span className="text-xl" role="img" aria-label={`${current.name} flag`}>
              {current.flag}
            </span>
            <span className="ml-2 hidden sm:inline">{current.name}</span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent>
        {Object.values(COUNTRIES).map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="flex items-center">
              <span className="mr-2" role="img" aria-label={`${c.name} flag`}>
                {c.flag}
              </span>
              <span className="hidden sm:inline">{c.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

