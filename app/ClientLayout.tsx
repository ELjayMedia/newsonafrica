"use client"
import logger from "@/utils/logger"

import "./globals.css"
import { Lexend } from "next/font/google"
import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { Header } from "@/components/Header"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Sidebar } from "@/components/Sidebar"
import Footer from "@/components/Footer"
import { UserProvider } from "@/contexts/UserContext"
import { AuthProvider } from "@/contexts/AuthContext"
import type React from "react"
import { ScrollToTop } from "@/components/ScrollToTop"
import { useEffect } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import ErrorFallback from "@/components/ErrorFallback"
import Link from "next/link"

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" })

export function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logger.error("Unhandled error:", event.error)
      if (event.error instanceof Error) {
        logger.error("Error message:", event.error.message)
        logger.error("Error stack:", event.error.stack)
      } else if (event.error === null) {
        logger.error("Unknown error object: null")
      } else {
        logger.error("Unknown error object:", event.error)
      }
    }

    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("error", handleError)
    }
  }, [])

  return (
    <html lang="en" className={`${lexend.variable} ${lexend.className}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${lexend.className} bg-gray-100`}>
        <ErrorBoundary
          fallback={
            <ErrorFallback
              error={new Error("An unexpected error occurred")}
              resetErrorBoundary={() => window.location.reload()}
            />
          }
        >
          <AuthProvider>
            <UserProvider>
              <ClientWrapper>
              <ScrollToTop />
              <TopBar />
              <div className="mx-auto max-w-full md:max-w-[980px] px-0 md:px-4">
                <Header />
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
          </UserProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

export default ClientLayout
