"use client"

import { useEffect, useTransition } from "react"
import { usePathname } from "next/navigation"

import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { updateAuthCountry } from "@/app/actions/auth"
import { useUser } from "@/contexts/UserContext"

const SUPPORTED_COUNTRY_CODES = new Set(SUPPORTED_COUNTRIES.map((country) => country.code))
const STORAGE_KEY = "preferredCountry"
const COOKIE_NAME = "preferredCountry"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

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

function persistPreferredCountry(countryCode: string) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(STORAGE_KEY, countryCode)
    } catch {
      // Ignore localStorage write failures
    }
  }

  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=${countryCode}; path=/; max-age=${ONE_YEAR_SECONDS}`
  }
}

export function PreferredCountrySync() {
  const pathname = usePathname()
  const { user } = useUser()
  const userId = user?.id ?? null
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!pathname) return

    const [potentialCountry] = pathname.split("/").filter(Boolean)
    if (!potentialCountry) return

    const normalized = potentialCountry.toLowerCase()
    if (!SUPPORTED_COUNTRY_CODES.has(normalized)) {
      return
    }

    const storedCountry = getStoredPreferredCountry()
    if (storedCountry === normalized) {
      return
    }

    persistPreferredCountry(normalized)

    if (userId) {
      startTransition(() => {
        void updateAuthCountry(normalized).catch((error) => {
          console.error("Failed to update Supabase auth country", error)
        })
      })
    }
  }, [pathname, startTransition, userId])

  return null
}
