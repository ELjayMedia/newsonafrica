import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { Header } from "@/components/Header"
import { HeaderSkeleton } from "@/components/HeaderSkeleton"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Sidebar } from "@/components/Sidebar"
import { TopBannerAd } from "@/components/TopBannerAd"
import { BelowHeaderAd } from "@/components/BelowHeaderAd"
import { FooterBannerAd } from "@/components/FooterBannerAd"
import { ScrollToTop } from "@/components/ScrollToTop"
import Link from "next/link"
import { siteConfig } from "@/config/site"
import { Suspense } from "react"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import NetworkStatus from "@/components/NetworkStatus"
import WebVitals from "@/components/WebVitals"
import { NetworkStatusHandler } from "@/components/NetworkStatusHandler"

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ["News", "Africa", "Current Events", "Politics", "Business"],
  authors: [{ name: "News On Africa Team" }],
  creator: "News On Africa",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${siteConfig.url}/og-image.jpg`],
    creator: "@newsonafrica",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]

  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <link rel="preload" as="image" href="/placeholder.svg" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="flex flex-col min-h-screen bg-gray-100">
        <ClientWrapper>
          <ScrollToTop />
          <ServiceWorkerRegistration />
          <WebVitals />
          <TopBar />
          <div className="flex-grow">
            <div className="mx-auto max-w-full md:max-w-[980px]">
              <TopBannerAd />
              <Suspense fallback={<HeaderSkeleton />}>
                <Header />
              </Suspense>
              <BelowHeaderAd />
              <div className="mt-4 md:mt-6">
                <div className="flex flex-col lg:flex-row lg:gap-2 lg:items-start">
                  <Suspense
                    fallback={
                      <div className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)] p-4 animate-pulse">
                        <div className="h-8 bg-gray-200 w-1/3 mb-4 rounded"></div>
                        <div className="h-4 bg-gray-200 w-full mb-2 rounded"></div>
                        <div className="h-4 bg-gray-200 w-5/6 mb-4 rounded"></div>
                      </div>
                    }
                  >
                    <main className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]">
                      <div className="p-4 w-full md:w-auto">{children}</div>
                    </main>
                  </Suspense>
                  <aside className="mt-6 lg:mt-0 lg:w-80 lg:flex-shrink-0">
                    <Sidebar />
                  </aside>
                </div>
              </div>
              <FooterBannerAd />
            </div>
          </div>
          <BottomNavigation />
          <div className="text-center text-sm text-gray-500 mt-4 mb-2">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
          </div>
          <NetworkStatus />
        </ClientWrapper>
        <NetworkStatusHandler />
      </body>
    </html>
  )
}
