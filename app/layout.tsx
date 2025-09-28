import type React from "react"
import type { Metadata } from "next"
import { inter, playfairDisplay, jetbrainsMono } from "@/lib/typography"
import { ClientWrapper } from "@/components/ClientWrapper"
import { ScrollToTop } from "@/components/ScrollToTop"
import Link from "next/link"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import { env } from "@/config/env"
import NetworkStatus from "@/components/NetworkStatus"
import { NetworkStatusHandler } from "@/components/NetworkStatusHandler"
import { UserProvider } from "@/contexts/UserContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ClientDynamicComponents } from "@/components/ClientDynamicComponents"
import { BookmarksProvider } from "@/contexts/BookmarksContext"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"
import { ElegantHeader } from "@/components/ElegantHeader"

import "./globals.css"

export const metadata: Metadata = {
  title: "News On Africa",
  description: "Your trusted source for news across Africa",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
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
  other: {
    preconnect: "https://cdn-lfdfp.nitrocdn.com",
    "dns-prefetch": "https://cdn-lfdfp.nitrocdn.com",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} ${inter.className}`}
    >
      <body className={inter.className}>
        <SchemaOrg schemas={baseSchemas} />

        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <UserProvider>
              <UserPreferencesProvider>
                <BookmarksProvider>
                  <ClientWrapper>
                    <ScrollToTop />
                    <ClientDynamicComponents />
                    <ElegantHeader />
                    <div className="min-h-screen bg-background">
                      <main className="flex-1">{children}</main>
                    </div>
                    <footer className="bg-earth-dark text-earth-dark-foreground py-8 mt-16">
                      <div className="mx-auto max-w-7xl px-4 text-center">
                        <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm">
                          <Link href="/privacy-policy" className="hover:text-earth-light transition-colors">
                            Privacy Policy
                          </Link>
                          <span className="hidden md:inline text-earth-light">|</span>
                          <Link href="/terms-of-service" className="hover:text-earth-light transition-colors">
                            Terms of Service
                          </Link>
                          <span className="hidden md:inline text-earth-light">|</span>
                          <Link href="/sitemap.xml" className="hover:text-earth-light transition-colors">
                            Sitemap
                          </Link>
                        </div>
                        <p className="mt-4 text-earth-light text-sm">
                          © 2025 News On Africa. Where the Continent Connects.
                        </p>
                      </div>
                    </footer>
                    <NetworkStatus />
                    <Toaster />
                    <NetworkStatusHandler />
                  </ClientWrapper>
                </BookmarksProvider>
              </UserPreferencesProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
