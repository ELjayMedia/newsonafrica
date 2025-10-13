"use client"

import "./globals.css"
import { Inter } from "next/font/google"
import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { useEffect, useMemo } from "react"

import { HeaderClient } from "@/components/HeaderClient"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Sidebar } from "@/components/Sidebar"
import Footer from "@/components/Footer"
import { UserProvider } from "@/contexts/UserContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"
import { UserPreferencesClientProvider } from "@/contexts/UserPreferencesClient"
import type React from "react"
import { ScrollToTop } from "@/components/ScrollToTop"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"
import ErrorBoundary from "@/components/ErrorBoundary"
import ErrorFallback from "@/components/ErrorFallback"
import Link from "next/link"
import { useCategories } from "@/lib/hooks/useWordPressData"
import { useUserPreferences } from "@/contexts/UserPreferencesClient"
import { getCurrentCountry } from "@/lib/utils/routing"
import { usePathname } from "next/navigation"

function LegacyHeader() {
  const pathname = usePathname()
  const countryCode = getCurrentCountry(pathname)
  const { categories } = useCategories(countryCode)
  const { preferences } = useUserPreferences()

  const sortedCategories = useMemo(() => {
    if (!categories || categories.length === 0) {
      return []
    }

    const favouriteSlugs = preferences.sections.map((section) => section.toLowerCase())
    if (!favouriteSlugs.length) {
      return [...categories].sort((a, b) => a.name.localeCompare(b.name))
    }

    return [...categories].sort((a, b) => {
      const aFavIndex = favouriteSlugs.indexOf(a.slug.toLowerCase())
      const bFavIndex = favouriteSlugs.indexOf(b.slug.toLowerCase())

      if (aFavIndex === -1 && bFavIndex === -1) {
        return a.name.localeCompare(b.name)
      }

      if (aFavIndex === -1) {
        return 1
      }

      if (bFavIndex === -1) {
        return -1
      }

      if (aFavIndex !== bFavIndex) {
        return aFavIndex - bFavIndex
      }

      return a.name.localeCompare(b.name)
    })
  }, [categories, preferences.sections])

  return <HeaderClient categories={sortedCategories} countryCode={countryCode} />
}

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error)
      if (event.error instanceof Error) {
        console.error("Error message:", event.error.message)
        console.error("Error stack:", event.error.stack)
      } else if (event.error === null) {
        console.error("Unknown error object: null")
      } else {
        console.error("Unknown error object:", event.error)
      }
    }

    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("error", handleError)
    }
  }, [])

  return (
    <html lang="en" className={`${inter.variable} ${inter.className}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} bg-gray-100`}>
        <ErrorBoundary
          fallback={
            <ErrorFallback
              error={new Error("An unexpected error occurred")}
              resetErrorBoundary={() => window.location.reload()}
            />
          }
        >
          <UserProvider>
              <UserPreferencesClientProvider
                initialData={{
                  userId: null,
                  preferences: { ...DEFAULT_USER_PREFERENCES },
                  profilePreferences: {},
                }}
              >
                <BookmarksProvider>
                  <ClientWrapper>
                    <ScrollToTop />
                    <TopBar />
                    <div className="mx-auto max-w-full md:max-w-[980px] px-0 md:px-4">
                      <LegacyHeader />
                      <div className="mt-4 md:mt-6">
                        <div className="flex flex-col lg:flex-row lg:gap-2 lg:items-start">
                          <main className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]">
                            <div className="p-1 md:p-2">{children}</div>
                          </main>
                          <aside className="mt-6 lg:mt-0 lg:w-80 lg:flex-shrink-0">
                            <Sidebar />
                          </aside>
                        </div>
                      </div>
                    </div>
                    <BottomNavigation />
                    <Footer />
                    <div className="text-center text-sm text-gray-500 mt-4">
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
                    </div>
                  </ClientWrapper>
                </BookmarksProvider>
              </UserPreferencesClientProvider>
            </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

export default ClientLayout
