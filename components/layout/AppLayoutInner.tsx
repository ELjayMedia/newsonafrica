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
import { cn } from "@/lib/utils"

interface AppLayoutInnerProps {
  children: ReactNode
  initialCountry: string
  sidebar?: ReactNode
}

export function AppLayoutInner({ children, initialCountry, sidebar }: AppLayoutInnerProps) {
  const hasSidebar = Boolean(sidebar)

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
          <div className="flex-1 bg-background">
            <div className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-4 pb-24 pt-4 md:gap-8 md:px-6 md:pb-12 md:pt-6">
              <header className="border-b border-border/60 pb-4 md:pb-6">
                <div className="hidden md:block">
                  <Suspense fallback={<HeaderSkeleton variant="desktop" />}>
                    <Header countryCode={initialCountry} variant="desktop" />
                  </Suspense>
                </div>
                <div className="md:hidden">
                  <Suspense fallback={<HeaderSkeleton variant="mobile" />}>
                    <Header countryCode={initialCountry} variant="mobile" />
                  </Suspense>
                </div>
              </header>
              <main
                className={cn(
                  "flex flex-1 flex-col gap-8 md:gap-10",
                  hasSidebar && "lg:flex-row lg:items-start lg:gap-[5px]",
                )}
              >
                <div className={cn("w-full", hasSidebar && "lg:w-[675px]")}>{children}</div>
                {hasSidebar ? <div className="hidden lg:block lg:w-[300px]">{sidebar}</div> : null}
              </main>
            </div>
          </div>
        </div>
        <div className="md:hidden">
          <BottomNavigation />
        </div>
        <Toaster />
      </ClientUserPreferencesProvider>
    </Providers>
  )
}
