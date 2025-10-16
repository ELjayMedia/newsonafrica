"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AFRICAN_EDITION, SUPPORTED_COUNTRIES, SUPPORTED_EDITIONS } from "@/lib/editions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { updateAuthCountry } from "@/app/actions/auth"
import { useUser } from "@/contexts/UserContext"

const STORAGE_KEY = "preferredCountry"
const COOKIE_NAME = "preferredCountry"

const SUPPORTED_COUNTRY_CODES = new Set(SUPPORTED_COUNTRIES.map((country) => country.code))

function getStoredPreferredCountry(): string | undefined {
  if (typeof document !== "undefined") {
    const preferredCookie = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))

    if (preferredCookie) {
      const [, value] = preferredCookie.split("=")
      if (value) {
        return decodeURIComponent(value)
      }
    }
  }

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage?.getItem(STORAGE_KEY)
      if (stored) {
        return stored
      }
    } catch {
      // Access to localStorage can fail in some environments; ignore and continue
    }
  }

  return undefined
}

function resolveEditionFromPreference(): string {
  const storedCountry = getStoredPreferredCountry()
  if (storedCountry && SUPPORTED_COUNTRY_CODES.has(storedCountry)) {
    return storedCountry
  }

  return AFRICAN_EDITION.code
}

function resolveEditionFromPath(pathname: string | null): string {
  if (!pathname) {
    return resolveEditionFromPreference()
  }

  const segments = pathname.split("/").filter(Boolean)
  if (!segments.length) {
    return resolveEditionFromPreference()
  }

  const [potentialCountry] = segments
  const normalized = potentialCountry.toLowerCase()

  if (normalized === AFRICAN_EDITION.code) {
    return AFRICAN_EDITION.code
  }

  if (SUPPORTED_COUNTRY_CODES.has(normalized)) {
    return normalized
  }

  return resolveEditionFromPreference()
}

export default function CountrySelector() {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedEdition, setSelectedEdition] = useState<string>(AFRICAN_EDITION.code)
  const { user } = useUser()
  const [, startTransition] = useTransition()

  useEffect(() => {
    setSelectedEdition(resolveEditionFromPath(pathname))
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
      if (user) {
        startTransition(() => {
          void updateAuthCountry(AFRICAN_EDITION.code).catch((error) => {
            console.error("Failed to update Supabase auth country", error)
          })
        })
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

    if (user) {
      startTransition(() => {
        void updateAuthCountry(country.code).catch((error) => {
          console.error("Failed to update Supabase auth country", error)
        })
      })
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
