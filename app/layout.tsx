import type { Metadata } from "next";
import { Suspense } from "react";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountMenu, AccountMenuFallback } from "@/components/account/account-menu";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.SITE_URL),
  title: {
    default: "News on Africa",
    template: "%s | News on Africa",
  },
  description: "Independent African journalism.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
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
        </ThemeProvider>
      </body>
    </html>
  );
}
