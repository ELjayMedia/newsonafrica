import type { ReactNode } from "react"
import Link from "next/link"

import { LayoutStructure } from "@/components/LayoutStructure"

interface AppChromeProps {
  children: ReactNode
  countryCode?: string
}

export function AppChrome({ children, countryCode }: AppChromeProps) {
  return (
    <>
      <div className="flex-grow rounded-xs shadow-none bg-transparent">
        <div className="mx-auto max-w-full md:max-w-[980px]">
          <LayoutStructure countryCode={countryCode}>
            <main className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]">
              <div className="p-2 md:p-4 w-full md:w-auto">{children}</div>
            </main>
          </LayoutStructure>
        </div>
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
    </>
  )
}
