"use client"

import { Suspense, type ReactNode } from "react"
import Link from "next/link"

import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { ScrollToTop } from "@/components/ScrollToTop"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Toaster } from "@/components/ui/toaster"

interface ClientLayoutComponentsProps {
  children: ReactNode
}

export function ClientLayoutComponents({ children }: ClientLayoutComponentsProps) {
  return (
    <ClientWrapper>
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
      <ClientDynamicComponents />
      <TopBar />
      <div className="flex-grow">
        <div className="mx-auto max-w-full md:max-w-[980px]">{children}</div>
      </div>
      <footer className="text-center text-sm text-gray-500 mt-3 mb-16 md:mb-2">
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
      <BottomNavigation />
      <Toaster />
    </ClientWrapper>
  )
}
