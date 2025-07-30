"use client"

import "./globals.css"
import { Inter } from "next/font/google"
import { ClientWrapper } from "@/components/ClientWrapper"
import { Analytics } from "@vercel/analytics/react"
import { GoogleAnalyticsScript } from "@/components/GoogleAnalyticsScript"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { TopBar } from "@/components/TopBar"
import { Header } from "@/components/Header"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Sidebar } from "@/components/Sidebar"
import { Footer } from "@/components/Footer"
import { UserProvider } from "@/contexts/UserContext"
import { TopBannerAd } from "@/components/TopBannerAd"
import { BelowHeaderAd } from "@/components/BelowHeaderAd"
import { FooterBannerAd } from "@/components/FooterBannerAd"
import type React from "react"
import { ScrollToTop } from "@/components/ScrollToTop"
import Script from "next/script"
import { useEffect, useState } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { ErrorFallback } from "@/components/ErrorFallback"
import Link from "next/link"
import dynamic from "next/dynamic"

const CameraFeature = dynamic(() => import("@/components/CameraFeature"), {
  ssr: false,
})
const GeolocationFeature = dynamic(
  () => import("@/components/GeolocationFeature"),
  { ssr: false }
)
const NotificationFeature = dynamic(
  () => import("@/components/NotificationFeature"),
  { ssr: false }
)

const inter = Inter({ subsets: ["latin"] })

export function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showNativeFeatures, setShowNativeFeatures] = useState(false)
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
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-gray-100">
        <ErrorBoundary
          fallback={
            <ErrorFallback
              error={new Error("An unexpected error occurred")}
              resetErrorBoundary={() => window.location.reload()}
            />
          }
        >
          <UserProvider>
            <ClientWrapper>
              <ScrollToTop />
              <TopBar />
              <div className="mx-auto max-w-full md:max-w-[980px] px-0 md:px-4">
                <TopBannerAd />
                <Header />
                <BelowHeaderAd />
                <div className="mt-4 md:mt-6">
                  <div className="flex flex-col lg:flex-row lg:gap-2 lg:items-start">
                    <main className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]">
                      <div className="p-1 md:p-2">{children}</div>
                      {/* New section for Capacitor features */}
                      <div className="p-4 md:p-6 mt-8 border-t border-gray-200">
                        <button
                          onClick={() => setShowNativeFeatures((prev) => !prev)}
                          className="mb-4 rounded-md bg-blue-600 px-4 py-2 text-white"
                        >
                          {showNativeFeatures
                            ? "Hide Native Features"
                            : "Show Native Features"}
                        </button>
                        {showNativeFeatures && (
                          <>
                            <h2 className="text-2xl font-bold mb-6 text-center">
                              Capacitor Native Features
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <CameraFeature />
                              <GeolocationFeature />
                              <NotificationFeature />
                            </div>
                          </>
                        )}
                      </div>
                    </main>
                    <aside className="mt-6 lg:mt-0 lg:w-80 lg:flex-shrink-0">
                      <Sidebar />
                    </aside>
                  </div>
                </div>
                <FooterBannerAd />
              </div>
              <BottomNavigation />
              <Footer />
              <div className="text-center text-sm text-gray-500 mt-4">
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
                {" | "}
                <Link href="/terms" className="hover:underline">
                  Terms of Service
                </Link>
                {" | "}
                <Link href="/sitemap.xml" className="hover:underline">
                  Sitemap
                </Link>
              </div>
            </ClientWrapper>
          </UserProvider>
        </ErrorBoundary>
        <GoogleAnalyticsScript />
        <Analytics />
        <SpeedInsights />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6089753674605524"
          strategy="afterInteractive"
          onError={(e) => {
            console.error("Failed to load AdSense script", e)
          }}
        />
      </body>
    </html>
  )
}

export default ClientLayout
