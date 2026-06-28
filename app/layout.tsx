import type React from "react"
import type { Metadata } from "next"
import { Archivo, Source_Sans_3 } from "next/font/google"

import { SchemaOrg } from "@/components/SchemaOrg"
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from "@/lib/schema"
import { validateRequiredEnv } from "@/lib/env"

import "./globals.css"

validateRequiredEnv()

// Archivo — display & UI (headlines, nav, buttons). Squarer, heavier weights for tabloid punch.
const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "800", "900"],
})

// Source Sans 3 — body & decks. Highly legible at small sizes in dense layouts.
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "News On Africa",
  description: "Your trusted source for news across Africa",
  metadataBase: new URL("https://newsonafrica.com"),
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
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()]

  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${archivo.variable} font-sans`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}
