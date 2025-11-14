import type { ReactNode } from "react"
import { headers } from "next/headers"

import { AppLayoutInner } from "./AppLayoutInner"
import { AFRICAN_EDITION, SUPPORTED_EDITIONS } from "@/lib/editions"
import { DEFAULT_COUNTRY, getServerCountry } from "@/lib/utils/routing"

interface AppLayoutProps {
  children: ReactNode
}

const SUPPORTED_EDITION_CODE_LOOKUP = new Map(
  SUPPORTED_EDITIONS.map((edition) => {
    const normalizedCode = edition.code.toLowerCase()
    return [normalizedCode, normalizedCode] as const
  }),
)

SUPPORTED_EDITION_CODE_LOOKUP.set("african", AFRICAN_EDITION.code.toLowerCase())

const HEADER_PATH_KEYS = [
  "x-invoke-path",
  "x-matched-path",
  "x-pathname",
  "x-next-url",
  "next-url",
  "x-url",
  "referer",
]

const normalizeEdition = (value?: string | null) => value?.toLowerCase() ?? undefined

const extractEditionFromPath = (value?: string | null) => {
  const normalized = value?.trim()
  if (!normalized) return undefined

  let pathname = normalized
  if (/^https?:\/\//i.test(normalized)) {
    try {
      pathname = new URL(normalized).pathname
    } catch {
      // Ignore malformed URLs and fall back to the raw value
    }
  }

  const [firstSegment] = pathname.split(/[?#]/)[0]?.split("/").filter(Boolean) ?? []
  const edition = normalizeEdition(firstSegment)

  return edition ? SUPPORTED_EDITION_CODE_LOOKUP.get(edition) : undefined
}

const getEditionFromRequest = () => {
  try {
    const headerList = headers()

    for (const key of HEADER_PATH_KEYS) {
      const edition = extractEditionFromPath(headerList.get(key))
      if (edition) {
        return edition
      }
    }
  } catch {
    // headers() can throw in non-request environments; ignore and fall back
  }

  return undefined
}

const resolveEdition = (explicit?: string) => {
  const normalizedExplicit = normalizeEdition(explicit)
  const explicitEdition = normalizedExplicit
    ? SUPPORTED_EDITION_CODE_LOOKUP.get(normalizedExplicit)
    : undefined
  if (explicitEdition) {
    return explicitEdition
  }

  const fromRequest = getEditionFromRequest()
  if (fromRequest) {
    return fromRequest
  }

  const fallback = normalizeEdition(getServerCountry())
  const canonicalFallback = fallback
    ? SUPPORTED_EDITION_CODE_LOOKUP.get(fallback) ?? fallback
    : undefined

  return canonicalFallback ?? DEFAULT_COUNTRY
}

export function AppLayout({ children }: AppLayoutProps) {
  const resolvedCountry = resolveEdition()

  return <AppLayoutInner initialCountry={resolvedCountry}>{children}</AppLayoutInner>
}

export type { AppLayoutProps }
