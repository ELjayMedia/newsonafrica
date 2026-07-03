import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountMenu, AccountMenuFallback } from "@/components/account/account-menu";
import { BottomNavigation } from "@/components/bottom-navigation";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { colorTokens } from "@/lib/design-tokens";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.SITE_URL),
  title: {
    default: "News on Africa",
    template: "%s | News on Africa",
  },
  description: "Independent African journalism.",
  // PWA / installability (NOA-109). The manifest link itself comes from
  // `app/manifest.ts`; these cover favicons and the iOS home-screen icon.
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "News on Africa",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // Browser/OS chrome color follows the app theme (NOA-109).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: `hsl(${colorTokens.light.background})` },
    { media: "(prefers-color-scheme: dark)", color: `hsl(${colorTokens.dark.background})` },
  ],
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) to take effect on notched iOS devices.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Mobile bottom padding matches the fixed bottom navigation height
          (h-16) + the device safe-area inset so content and the footer are
          never hidden behind it (NOA-111). */}
      <body className="flex min-h-screen flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* WebSite + Organization structured data (NOA-114). */}
        <SiteJsonLd />
        <ThemeProvider>
          <SiteHeader
            accountSlot={
              <Suspense fallback={<AccountMenuFallback />}>
                <AccountMenu />
              </Suspense>
            }
          />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <BottomNavigation />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
