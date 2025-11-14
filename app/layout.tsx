import type React from "react"
import type { Metadata } from "next"

import { SchemaOrg } from "@/components/SchemaOrg"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import { ENV } from "@/config/env"
import { AppLayout } from "@/components/layout/AppLayout"

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
  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="bg-background font-sans antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
