import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { SchemaOrg } from "@/components/SchemaOrg"
import { TopBar } from "@/components/TopBar"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { BottomNavigation } from "@/components/BottomNavigation"
import { ScrollToTop } from "@/components/ScrollToTop"
import { Toaster } from "@/components/ui/toaster"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import { ENV } from "@/config/env"
import { Providers } from "./providers"
import { getCurrentSession } from "@/app/actions/auth"
import { getUserPreferences, type UserPreferencesSnapshot } from "@/app/actions/preferences"
import type { AuthStatePayload } from "@/app/actions/auth"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"

import "./globals.css"

function createDefaultPreferencesSnapshot(): UserPreferencesSnapshot {
  return {
    userId: null,
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      sections: [...DEFAULT_USER_PREFERENCES.sections],
      blockedTopics: [...DEFAULT_USER_PREFERENCES.blockedTopics],
      countries: [...DEFAULT_USER_PREFERENCES.countries],
    },
    profilePreferences: {},
  }
}

async function resolveInitialAuthState(): Promise<AuthStatePayload | null> {
  try {
    const result = await getCurrentSession()
    if (result.error) {
      console.error("Failed to resolve initial auth state:", result.error)
      return null
    }
    return result.data
  } catch (error) {
    console.error("Unexpected error resolving initial auth state:", error)
    return null
  }
}

async function resolveInitialPreferences(): Promise<UserPreferencesSnapshot> {
  try {
    const result = await getUserPreferences()
    if (result.error || !result.data) {
      if (result.error) {
        console.error("Failed to resolve initial preferences:", result.error)
      }
      return createDefaultPreferencesSnapshot()
    }
    return result.data
  } catch (error) {
    console.error("Unexpected error resolving initial preferences:", error)
    return createDefaultPreferencesSnapshot()
  }
}

export const metadata: Metadata = {
  title: "News On Africa",
  description: "Your trusted source for news across Africa",
  metadataBase: new URL(ENV.NEXT_PUBLIC_SITE_URL),
  applicationName: "News On Africa",
  keywords: ["Africa", "news", "journalism", "current events", "African news"],
  authors: [{ name: "News On Africa Team" }],
  creator: "News On Africa",
  publisher: "News On Africa",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
    generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]
  const [initialAuthState, initialPreferences] = await Promise.all([
    resolveInitialAuthState(),
    resolveInitialPreferences(),
  ])

  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="font-sans">
        <Providers initialAuthState={initialAuthState} initialPreferences={initialPreferences}>
          <PreferredCountrySync />
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <ClientDynamicComponents />
          <TopBar />
          <div className="flex-grow rounded-xs shadow-none bg-transparent">
            <div className="mx-auto max-w-full md:max-w-[980px]">{children}</div>
          </div>
          <footer className="text-center text-sm text-gray-500 mt-3 mb-16 md:mb-2">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
            {" | "}
            <Link href="/sitemap.xml" className="hover:underline">
              Sitemap
            </Link>
          </footer>
          <BottomNavigation />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
