"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { updateAuthCountry } from "@/app/actions/auth"
import { useUser } from "@/contexts/UserContext"
import {
  AFRICAN_EDITION,
  SUPPORTED_EDITIONS,
  isAfricanEdition,
  isCountryEdition,
  type SupportedEdition,
} from "@/lib/editions"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

interface CountrySwitcherClientProps {
  currentCountry: string
}

const normalizeEditionCode = (code: string) => code.trim().toLowerCase()

const resolveEdition = (code: string): SupportedEdition => {
  const normalized = normalizeEditionCode(code)
  return SUPPORTED_EDITIONS.find((edition) => edition.code === normalized) ?? AFRICAN_EDITION
}

export function CountrySwitcherClient({ currentCountry }: CountrySwitcherClientProps) {
  const router = useRouter()
  const { user } = useUser()
  const [isPending, startTransition] = useTransition()

  const initialEdition = useMemo(() => resolveEdition(currentCountry), [currentCountry])
  const [selectedEdition, setSelectedEdition] = useState<string>(initialEdition.code)

  useEffect(() => {
    setSelectedEdition(resolveEdition(currentCountry).code)
  }, [currentCountry])

  const activeEdition = useMemo(() => resolveEdition(selectedEdition), [selectedEdition])

  const handleEditionChange = (value: string) => {
    setSelectedEdition(value)

    const edition = resolveEdition(value)

    if (isAfricanEdition(edition)) {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("preferredCountry")
        } catch (error) {
          console.warn("Failed to clear preferred country from localStorage", error)
        }
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

    if (!isCountryEdition(edition)) {
      router.push("/")
      return
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("preferredCountry", edition.code)
      } catch (error) {
        console.warn("Failed to persist preferred country in localStorage", error)
      }
      document.cookie = `preferredCountry=${edition.code}; path=/; max-age=${60 * 60 * 24 * 365}`
    }

    if (user) {
      startTransition(() => {
        void updateAuthCountry(edition.code).catch((error) => {
          console.error("Failed to update Supabase auth country", error)
        })
      })
    }

    router.push(`/${edition.code}`)
  }

  return (
    <Select value={selectedEdition} onValueChange={handleEditionChange} disabled={isPending}>
      <SelectTrigger
        aria-label="Select country"
        className="w-[180px] gap-2 border-none bg-transparent px-2 py-1 text-sm font-medium focus:ring-0"
      >
        <span className="flex items-center gap-2">
          <span role="img" aria-label={`${activeEdition.name} flag`}>
            {activeEdition.flag}
          </span>
          <span className="hidden sm:inline">{activeEdition.name}</span>
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_EDITIONS.map((edition) => (
          <SelectItem key={edition.code} value={edition.code}>
            <span className="flex items-center gap-2">
              <span role="img" aria-label={`${edition.name} flag`}>
                {edition.flag}
              </span>
              <span>{edition.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
