import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { ScrollToTop } from "@/components/ScrollToTop"
import Link from "next/link"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import NetworkStatus from "@/components/NetworkStatus"
import { NetworkStatusHandler } from "@/components/NetworkStatusHandler"
import { UserProvider } from "@/contexts/UserContext"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ClientDynamicComponents } from "@/components/ClientDynamicComponents"
import { BookmarksProvider } from "@/contexts/BookmarksContext"
import ClientLayoutComponents from "./ClientLayoutComponents"

import "./globals.css"

// Optimize font loading
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
})

export const metadata: Metadata = {
  title: "News On Africa",
  description: "Your trusted source for news across Africa",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://newsonafrica.com"),
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
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]

  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <UserProvider>
            <BookmarksProvider>
              <ClientWrapper>
                <ScrollToTop />
                <ClientDynamicComponents />
                <TopBar />
                <div className="flex-grow">
                  <div className="mx-auto max-w-full md:max-w-[980px]">
                    <ClientLayoutComponents>
                      <main className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]">
                        <div className="p-4 w-full md:w-auto">{children}</div>
                      </main>
                    </ClientLayoutComponents>
                  </div>
                </div>
                <footer className="text-center text-sm text-gray-500 mt-4 mb-2">
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
                <NetworkStatus />
                <Toaster />
                <NetworkStatusHandler />
              </ClientWrapper>
            </BookmarksProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
