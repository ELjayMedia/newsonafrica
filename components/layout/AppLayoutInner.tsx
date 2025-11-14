"use client"

import { Suspense, type ReactNode } from "react"

import { Providers } from "@/app/providers"
import { ClientUserPreferencesProvider } from "@/app/ClientUserPreferencesProvider"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { TopBar } from "@/components/TopBar"
import { Header } from "@/components/Header"
import { HeaderSkeleton } from "@/components/HeaderSkeleton"
import { ScrollToTop } from "@/components/ScrollToTop"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Toaster } from "@/components/ui/toaster"

interface AppLayoutInnerProps {
  children: ReactNode
  initialCountry: string
}

export function AppLayoutInner({ children, initialCountry }: AppLayoutInnerProps) {
  return (
    <Providers initialAuthState={null}>
      <ClientUserPreferencesProvider>
        <PreferredCountrySync />
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <ClientDynamicComponents />
        <div className="flex min-h-screen flex-col bg-background">
          <TopBar />
          <header className="border-b border-border/60 bg-background">
            <div className="mx-auto w-full max-w-[980px] px-4 py-4 md:px-6 md:py-6">
              <Suspense fallback={<HeaderSkeleton />}>
                <Header countryCode={initialCountry} />
              </Suspense>
            </div>
          </header>
          <main className="flex-1 bg-background">
            <div className="mx-auto w-full max-w-[980px] px-4 py-6 md:px-6 md:py-10">{children}</div>
          </main>
        </div>
        <BottomNavigation />
        <Toaster />
      </ClientUserPreferencesProvider>
    </Providers>
  )
}
