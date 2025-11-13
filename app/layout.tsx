import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { SchemaOrg } from "@/components/SchemaOrg"
import { LayoutStructure } from "@/components/LayoutStructure"
import { TopBar } from "@/components/TopBar"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { BottomNavigation } from "@/components/BottomNavigation"
import { ScrollToTop } from "@/components/ScrollToTop"
import { Toaster } from "@/components/ui/toaster"
import { Container, Stack } from "@/components/ui/grid"
import { TypographyMuted } from "@/components/ui/typography"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import { ENV } from "@/config/env"
import { Providers } from "./providers"
import { ClientUserPreferencesProvider } from "./ClientUserPreferencesProvider"

import "./globals.css"

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]
  const currentYear = new Date().getFullYear()

  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers initialAuthState={null}>
          <ClientUserPreferencesProvider>
            <PreferredCountrySync />
            <Suspense fallback={null}>
              <ScrollToTop />
            </Suspense>
            <ClientDynamicComponents />
            <TopBar />
            <Container size="2xl" className="flex w-full flex-1 flex-col gap-10 pb-20 pt-6 md:pt-10 lg:pt-12">
              <LayoutStructure>{children}</LayoutStructure>
              <footer className="border-t border-border/60 pt-6">
                <Stack align="center" space={2} className="items-center space-y-2 text-center">
                  <TypographyMuted className="text-sm">
                    © {currentYear} News On Africa. All rights reserved.
                  </TypographyMuted>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                    <Link href="/privacy-policy" className="text-muted-foreground transition-colors hover:text-foreground">
                      Privacy Policy
                    </Link>
                    <Link href="/terms-of-service" className="text-muted-foreground transition-colors hover:text-foreground">
                      Terms of Service
                    </Link>
                    <Link href="/sitemap.xml" className="text-muted-foreground transition-colors hover:text-foreground">
                      Sitemap
                    </Link>
                  </div>
                </Stack>
              </footer>
            </Container>
            <BottomNavigation />
            <Toaster />
          </ClientUserPreferencesProvider>
        </Providers>
      </body>
    </html>
  )
}
