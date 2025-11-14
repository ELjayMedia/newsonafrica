import { Suspense, type ReactNode } from "react"
import { headers } from "next/headers"

import { Providers } from "@/app/providers"
import { ClientUserPreferencesProvider } from "@/app/ClientUserPreferencesProvider"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { TopBar } from "@/components/TopBar"
import { Header } from "@/components/Header"
import { HeaderSkeleton } from "@/components/HeaderSkeleton"
import { ScrollToTop } from "@/components/ScrollToTop"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Toaster } from "@/components/ui/toaster"
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

  return (
    <Providers initialAuthState={null}>
      <ClientUserPreferencesProvider>
        <PreferredCountrySync />
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <ClientDynamicComponents />
        <div className="flex min-h-screen flex-col bg-background">
          <TopBar />
          <header className="border-b border-border/60 bg-background">
            <div className="mx-auto w-full max-w-[980px] px-4 py-4 md:px-6 md:py-6">
              <Suspense fallback={<HeaderSkeleton />}>
                <Header countryCode={resolvedCountry} />
              </Suspense>
            </div>
          </header>
          <main className="flex-1 bg-background">
            <div className="mx-auto w-full max-w-[980px] px-4 py-6 md:px-6 md:py-10">{children}</div>
          </main>
        </div>
        <BottomNavigation />
        <Toaster />
      </ClientUserPreferencesProvider>
    </Providers>
  )
}
