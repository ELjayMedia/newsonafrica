import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Offline - News On Africa",
  description: "You're currently offline. Browse cached content and check your connection.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
