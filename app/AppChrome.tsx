import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { cookies } from "next/headers"

import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { BottomNavigation } from "@/components/BottomNavigation"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { ScrollToTop } from "@/components/ScrollToTop"
import { TopBar } from "@/components/TopBar"
import { Toaster } from "@/components/ui/toaster"
import { Sidebar } from "@/components/Sidebar"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

interface AppChromeProps {
  children: ReactNode
}

export function AppChrome({ children }: AppChromeProps) {
  const preferredCountry =
    cookies().get("preferredCountry")?.value?.toLowerCase() ?? DEFAULT_COUNTRY

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

<<<<<<< HEAD
      <div className="mx-auto w-full max-w-[980px]">{children}</div>

      <footer className="mt-3 mb-16 text-center text-sm text-gray-500 md:mb-2">
=======
      <div className="mx-auto w-full max-w-full md:max-w-[980px]">
        <div className="lg:flex lg:items-start lg:gap-4">
          <main className="flex-1">{children}</main>

          <div className="lg:w-[360px] lg:flex-shrink-0">
            <Suspense fallback={null}>
              <Sidebar country={preferredCountry} />
            </Suspense>
          </div>
        </div>
      </div>

      <footer className="text-center text-sm text-gray-500 mt-3 mb-16 md:mb-2">
>>>>>>> 31396c6f (Add desktop sidebar to AppChrome across app layouts)
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
