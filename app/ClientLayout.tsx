"use client"

import "./globals.css"
import { Inter } from "next/font/google"
import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { useEffect, useMemo } from "react"

import { HeaderClient } from "@/components/HeaderClient"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Sidebar as AppSidebar } from "@/components/Sidebar"
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
import {
  SidebarProvider,
  Sidebar as SidebarRoot,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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

  const hideHeaderOnMobile = ["/bookmarks", "/profile", "/subscribe"].includes(pathname)
  const searchPage = pathname === "/search"
  const fallbackTriggerBreakpoint = hideHeaderOnMobile ? "md:hidden" : searchPage ? "sm:hidden" : ""
  const showFallbackTrigger = fallbackTriggerBreakpoint.length > 0

  return (
    <>
      {showFallbackTrigger ? (
        <div
          className={`mx-auto flex max-w-full md:max-w-[980px] justify-end px-0 md:px-4 ${fallbackTriggerBreakpoint}`}
        >
          <SidebarTrigger className={`${fallbackTriggerBreakpoint} text-gray-700 hover:bg-gray-100`} />
        </div>
      ) : null}
      <HeaderClient categories={sortedCategories} countryCode={countryCode} />
    </>
  )
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
                  <SidebarProvider>
                    <ClientWrapper>
                      <SidebarRoot
                        collapsible="offcanvas"
                        side="right"
                        className="bg-transparent"
                        style={{
                          "--sidebar-width": "20rem",
                        } as React.CSSProperties}
                      >
                        <AppSidebar />
                      </SidebarRoot>
                      <SidebarInset className="bg-transparent">
                        <ScrollToTop />
                        <TopBar />
                        <div className="mx-auto w-full max-w-full md:max-w-[980px] px-0 md:px-4">
                          <LegacyHeader />
                          <div className="mt-4 md:mt-6">
                            <div className="bg-white shadow-md md:rounded-lg overflow-hidden">
                              <div className="p-1 md:p-2">{children}</div>
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
                      </SidebarInset>
                    </ClientWrapper>
                  </SidebarProvider>
                </BookmarksProvider>
              </UserPreferencesClientProvider>
            </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

export default ClientLayout
