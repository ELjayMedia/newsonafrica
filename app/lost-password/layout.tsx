import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import { SchemaOrg } from "@/components/SchemaOrg"
import { getWebSiteSchema } from "@/lib/schema"

import "../globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Reset Password - News On Africa",
  description: "Reset your password for News On Africa",
}

export default function LostPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Base schemas for the page
  const baseSchemas = [getWebSiteSchema()]

  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body className="flex flex-col min-h-screen bg-gray-100">
        <div className="flex-grow">
          <div className="mx-auto max-w-full md:max-w-[980px]">
            <main className="flex-1">{children}</main>
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 mt-4 mb-4">
          <Link href="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>
          {" | "}
          <Link href="/terms-of-service" className="hover:underline">
            Terms of Service
          </Link>
        </div>
      </body>
    </html>
  )
}
