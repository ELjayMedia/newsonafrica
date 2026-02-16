import { Suspense, type ReactNode } from "react"
import Link from "next/link"

import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { ScrollToTop } from "@/components/ScrollToTop"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { Header } from "@/components/Header"
import { TopBar } from "@/components/TopBar"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Toaster } from "@/components/ui/toaster"

interface AppChromeProps {
  children: ReactNode
}

export function AppChrome({ children }: AppChromeProps) {
  return (
    <>
      <PreferredCountrySync />
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
      <ClientDynamicComponents />
      <TopBar />
      <Suspense fallback={<div className="h-16 bg-white shadow-md" />}>
        <Header />
      </Suspense>
      <div className="flex-grow rounded-xs shadow-none bg-transparent">
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
    </>
  )
}
