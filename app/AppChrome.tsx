import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { cookies } from "next/headers"

import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { BottomNavigation } from "@/components/BottomNavigation"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { ScrollToTop } from "@/components/ScrollToTop"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { Toaster } from "@/components/ui/toaster"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"

interface AppChromeProps {
  children: ReactNode
}

export async function AppChrome({ children }: AppChromeProps) {
  const cookieStore = await cookies()
  const preferredCountry =
    cookieStore.get("preferredCountry")?.value?.toLowerCase() ?? DEFAULT_COUNTRY

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

      <div className="mx-auto w-full max-w-[1360px] px-0 lg:px-4">
        <div className="lg:flex lg:items-start lg:gap-6">
          <main className="min-w-0 flex-1 lg:max-w-[980px]">{children}</main>

          <aside className="hidden lg:block lg:w-[360px] lg:flex-shrink-0">
            <Suspense fallback={null}>
              <Sidebar country={preferredCountry} />
            </Suspense>
          </aside>
        </div>
      </div>

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
