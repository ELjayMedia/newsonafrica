import { Suspense } from "react"
import type { ReactNode } from "react"
import Link from "next/link"

import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { ClientUserPreferencesProvider } from "@/app/ClientUserPreferencesProvider"
import { PreferredCountrySync } from "@/components/PreferredCountrySync"
import { LayoutStructure } from "@/components/LayoutStructure"
import { TopBar } from "@/components/TopBar"
import { BottomNavigation } from "@/components/BottomNavigation"
import { ScrollToTop } from "@/components/ScrollToTop"
import { Toaster } from "@/components/ui/toaster"
import { Container, Stack } from "@/components/ui/grid"
import { TypographyMuted } from "@/components/ui/typography"
import { Providers } from "@/app/providers"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const currentYear = new Date().getFullYear()

  return (
    <Providers initialAuthState={null}>
      <ClientUserPreferencesProvider>
        <PreferredCountrySync />
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <ClientDynamicComponents />
        <TopBar />
        <Container size="2xl" className="flex w-full flex-1 flex-col gap-10 pb-20 pt-6 md:pt-10 lg:pt-12">
          <LayoutStructure>{children}</LayoutStructure>
          <footer className="border-t border-border/60 pt-6">
            <Stack align="center" space={2} className="items-center space-y-2 text-center">
              <TypographyMuted className="text-sm">
                © {currentYear} News On Africa. All rights reserved.
              </TypographyMuted>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link href="/privacy-policy" className="text-muted-foreground transition-colors hover:text-foreground">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="text-muted-foreground transition-colors hover:text-foreground">
                  Terms of Service
                </Link>
                <Link href="/sitemap.xml" className="text-muted-foreground transition-colors hover:text-foreground">
                  Sitemap
                </Link>
              </div>
            </Stack>
          </footer>
        </Container>
        <BottomNavigation />
        <Toaster />
      </ClientUserPreferencesProvider>
    </Providers>
  )
}
