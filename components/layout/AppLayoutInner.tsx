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
          <div className="hidden md:block">
            <TopBar />
          </div>
          <div className="bg-background">
            <div className="hidden border-b border-border/60 md:block">
              <div className="mx-auto w-full max-w-[980px] px-6 py-6">
                <Suspense fallback={<HeaderSkeleton variant="desktop" />}>
                  <Header countryCode={initialCountry} variant="desktop" />
                </Suspense>
              </div>
            </div>
            <div className="border-b border-border/60 md:hidden">
              <div className="px-4 py-4">
                <Suspense fallback={<HeaderSkeleton variant="mobile" />}>
                  <Header countryCode={initialCountry} variant="mobile" />
                </Suspense>
              </div>
            </div>
          </div>
          <main className="flex-1 bg-background">
            <div className="mx-auto w-full max-w-[980px] px-4 pb-24 pt-6 md:px-6 md:pb-12 md:pt-10">
              {children}
            </div>
          </main>
        </div>
        <div className="md:hidden">
          <BottomNavigation />
        </div>
        <Toaster />
      </ClientUserPreferencesProvider>
    </Providers>
  )
}
