"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AFRICAN_EDITION, SUPPORTED_EDITIONS } from "@/lib/editions"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { updateAuthCountry } from "@/app/actions/auth"
import { useUser } from "@/contexts/UserContext"

const EDITIONS_BY_CODE = new Map(SUPPORTED_EDITIONS.map((edition) => [edition.code, edition]))

function useSafeUser() {
  try {
    return useUser()
  } catch {
    return { user: null } as Pick<ReturnType<typeof useUser>, "user">
  }
}

export default function CountrySwitcherClient() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useSafeUser()
  const [selectedEdition, setSelectedEdition] = useState<string>(AFRICAN_EDITION.code)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!pathname) {
      setSelectedEdition(AFRICAN_EDITION.code)
      return
    }

    const [potentialCountry] = pathname.split("/").filter(Boolean)
    if (!potentialCountry) {
      setSelectedEdition(AFRICAN_EDITION.code)
      return
    }

    const normalized = potentialCountry.toLowerCase()
    if (EDITIONS_BY_CODE.has(normalized)) {
      setSelectedEdition(normalized)
      return
    }

    setSelectedEdition(AFRICAN_EDITION.code)
  }, [pathname])

  const currentEdition = useMemo(() => {
    return EDITIONS_BY_CODE.get(selectedEdition) ?? AFRICAN_EDITION
  }, [selectedEdition])

  const handleChange = async (value: string) => {
    const normalized = value.toLowerCase()
    const edition = EDITIONS_BY_CODE.get(normalized)

    if (!edition) {
      console.warn(`[CountrySwitcherClient] Unsupported edition selected: ${value}`)
      return
    }

    setSelectedEdition(edition.code)

    try {
      const response = await fetch("/api/set-country", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: edition.code }),
      })

      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`)
      }
    } catch (error) {
      console.error("[CountrySwitcherClient] Failed to persist country preference", error)
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
