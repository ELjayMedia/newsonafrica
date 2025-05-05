import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Special Projects - News On Africa",
  description: "Explore our special projects and in-depth coverage of important topics across Africa.",
}

export default function SpecialProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Static server-side layout */}
      {children}
    </>
  )
}
