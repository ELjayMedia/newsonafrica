import { Suspense, type ReactNode } from "react"
import Link from "next/link"

import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { BottomNavigation } from "@/components/BottomNavigation"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { ScrollToTop } from "@/components/ScrollToTop"
import { TopBar } from "@/components/TopBar"
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

      <Suspense fallback={null}>
        <TopBar />
      </Suspense>

      <div className="mx-auto w-full max-w-[980px]">{children}</div>

      <footer className="mt-3 mb-16 text-center text-sm text-gray-500 md:mb-2">
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
