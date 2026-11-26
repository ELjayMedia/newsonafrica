import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { UtilityBar } from "@/components/utility-bar";
import { AdSlot } from "@/components/ads/ad-slot";
import { TakeoverSkin } from "@/components/ads/takeover-skin";
import { SiteFooter } from "@/components/site-footer";
import { AccountMenu, AccountMenuFallback } from "@/components/account/account-menu";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileStickyAd } from "@/components/ads/mobile-sticky-ad";
import { NotOnArticle, NotOnHome } from "@/components/ads/not-on-article";
import { HideOnMobileArticle } from "@/components/hide-on-mobile-article";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { colorTokens } from "@/lib/design-tokens";
import { publicEnv } from "@/lib/env";
import { getNavSections } from "@/lib/nav";

// Bold Punch typography (design system §03): Archivo carries mastheads,
// eyebrows and the heavy condensed headlines; Source Sans 3 carries body copy.
// Exposed as CSS variables so globals.css helper classes can reference them.
//
// Self-hosted from app/fonts (the Latin variable files Google Fonts serves,
// byte-identical to what next/font/google downloaded; OFL-licensed, licences
// alongside). Builds no longer fetch from fonts.googleapis.com, which made CI
// and deploys fail whenever Google returned an unexpected response.
const archivo = localFont({
  src: [{ path: "./fonts/archivo-latin-variable.woff2", weight: "500 900", style: "normal" }],
  variable: "--font-archivo",
  display: "swap",
});

const sourceSans = localFont({
  src: [{ path: "./fonts/source-sans-3-latin-variable.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.SITE_URL),
  title: {
    default: "News on Africa",
    template: "%s | News on Africa",
  },
  description: "Independent African journalism.",
  // Site-wide social defaults (NOA-115). og:image / twitter:image come from
  // the file conventions: app/opengraph-image.tsx everywhere, overridden by
  // the per-article branded card on article pages.
  openGraph: {
    type: "website",
    siteName: "News on Africa",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  // PWA / installability (NOA-109). The manifest link itself comes from
  // `app/manifest.ts`; these cover favicons and the iOS home-screen icon.
  icons: {
    // .ico first for browsers and crawlers that ignore SVG (Safari tabs,
    // Google search results); SVG and PNGs for everything else.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icons/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // WordPress-driven header sections (default edition; hrefs are edition-aware
  // in the client header). Cached + degrades to Home-only nav on failure.
  const navSections = await getNavSections();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${sourceSans.variable}`}
    >
      {/* The fixed mobile bottom navigation reserves its own height with a
          spacer (NOA-111), so pages without the bar (articles) don't end in
          an empty band. */}
      <body className="flex min-h-screen flex-col bg-noa-paper lg:bg-noa-canvas">
        {/* WebSite + Organization structured data (NOA-114). */}
        <SiteJsonLd />
        {/* Bypass block (WCAG 2.4.1): first tab stop jumps past the utility
            bar, masthead and section nav straight to the page content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-noa-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-noa-white"
        >
          Skip to content
        </a>
        <ThemeProvider>
          {/* Body-level takeover skin (home routes, wide screens): a fixed
              gradient behind everything. The masthead, page content and footer
              share one centred white sheet (.noa-well, z-10) that floats above
              it, with the full-bleed utility bar spanning the top. */}
          <TakeoverSkin />
          <HideOnMobileArticle>
            <UtilityBar
              accountSlot={
                <Suspense fallback={<AccountMenuFallback />}>
                  <AccountMenu />
                </Suspense>
              }
            />
          </HideOnMobileArticle>
          {/* Desktop leaderboard above the header, on the grey canvas. Renders
              nothing (no space) unless a campaign or ad preview fills it. */}
          {/* Home routes lead with the billboard instead: one top unit a page. */}
          <NotOnHome>
            <AdSlot placement="desktop-top-leaderboard" className="relative z-10 py-5" />
          </NotOnHome>
          {/* The header stays boxed to the content column; the footer is a
              full-width band. Between them the page content sits in the
              centred well (a white sheet on mobile, a transparent column of
              white panels on desktop). */}
          <div className="relative z-10 mx-auto w-full max-w-[var(--noa-well-w)] lg:px-6">
            <SiteHeader sections={navSections} />
          </div>
          {/* Mobile top banner under the header (not on articles, which carry
              in-article zones). Collapses until Revive fills it. */}
          <NotOnArticle>
            <AdSlot placement="mobile-top-banner" className="relative z-10 bg-noa-paper py-3" />
          </NotOnArticle>
          <div className="noa-well relative z-10 flex flex-1 flex-col">
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
          </div>
          <div className="relative z-10">
            <SiteFooter sections={navSections} />
          </div>
          <MobileStickyAd />
          <BottomNavigation />
          <ServiceWorkerRegistration />
          <PageViewTracker />
        </ThemeProvider>
      </body>
    </html>
  );
}
