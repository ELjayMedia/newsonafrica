import type React from "react"
import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import { env } from "@/config/env"
import { LayoutStructure } from "@/components/LayoutStructure"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"
import { BookmarksProvider } from "@/contexts/BookmarksContext"

const ClientProviders = dynamic(() =>
  import("@/components/ClientProviders").then((mod) => ({ default: mod.ClientProviders })),
)

const ClientLayoutComponents = dynamic(() =>
  import("@/components/ClientLayoutComponents").then((mod) => ({ default: mod.ClientLayoutComponents })),
)

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
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]

  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <meta name="algolia-site-verification"  content="1AA317933205C325" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="font-sans">
        <ClientProviders>
          <UserPreferencesProvider>
            <BookmarksProvider>
              <ClientLayoutComponents>
                <LayoutStructure>{children}</LayoutStructure>
              </ClientLayoutComponents>
            </BookmarksProvider>
          </UserPreferencesProvider>
        </ClientProviders>
      </body>
    </html>
  )
}
