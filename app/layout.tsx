import '@/config/env';
import type { Metadata } from 'next';
import Link from 'next/link';
import type React from 'react';

import ClientLayoutComponents from './ClientLayoutComponents';

import { ClientDynamicComponents } from '@/components/ClientDynamicComponents';
import { ClientWrapper } from '@/components/ClientWrapper';
import NetworkStatus from '@/components/NetworkStatus';
import { NetworkStatusHandler } from '@/components/NetworkStatusHandler';
import { SchemaOrg } from '@/components/SchemaOrg';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SkipToContent } from '@/components/SkipToContent';
import { TopBar } from '@/components/TopBar';
import { MegaNav } from '@/components/header/MegaNav';
import { UtilityBar } from '@/components/header/UtilityBar';
import { MarketTicker } from '@/components/home/MarketTicker';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { BookmarksProvider } from '@/contexts/BookmarksContext';
import { UserProvider } from '@/contexts/UserContext';
import { ConsentManager } from '@/features/consent/ConsentManager';
import { getMarketSnapshot } from '@/lib/api/market';
import { initAuth } from '@/lib/initAuth';
import { getNewsMediaOrganizationSchema, getWebSiteSchema } from '@/lib/schema';

import './globals.css';
import '@/styles/prose.css';
import '@/styles/tokens.css';

export const metadata: Metadata = {
  title: 'News On Africa',
  description: 'Your trusted source for news across Africa',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://newsonafrica.com'),
  applicationName: 'News On Africa',
  keywords: ['Africa', 'news', 'journalism', 'current events', 'African news'],
  authors: [{ name: 'News On Africa Team' }],
  creator: 'News On Africa',
  publisher: 'News On Africa',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  generator: 'v0.dev',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await initAuth();
  // Base schemas for the entire site
  const baseSchemas = [getNewsMediaOrganizationSchema(), getWebSiteSchema()];
  const marketItems = await getMarketSnapshot();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn-lfdfp.nitrocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-lfdfp.nitrocdn.com" />
        <SchemaOrg schemas={baseSchemas} />
      </head>
      <body>
        <SkipToContent />
        <ConsentManager>
          <ThemeProvider attribute="class" defaultTheme="light">
            <UserProvider>
              <BookmarksProvider>
                <ClientWrapper>
                  <ScrollToTop />
                  <ClientDynamicComponents />
                  <UtilityBar />
                  <TopBar />
                  <MegaNav />
                  {marketItems.length > 0 && <MarketTicker items={marketItems} />}
                  <div className="flex-grow">
                    <div className="mx-auto max-w-full md:max-w-[980px]">
                      <ClientLayoutComponents>
                        <main
                          id="main-content"
                          className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)]"
                        >
                          <div className="p-2 md:p-4 w-full md:w-auto">{children}</div>
                        </main>
                      </ClientLayoutComponents>
                    </div>
                  </div>
                  <footer className="text-center text-sm text-gray-500 mt-3 mb-16 md:mb-2">
                    <Link href="/privacy-policy" className="hover:underline">
                      Privacy Policy
                    </Link>
                    {' | '}
                    <Link href="/terms-of-service" className="hover:underline">
                      Terms of Service
                    </Link>
                    {' | '}
                    <Link href="/sitemap.xml" className="hover:underline">
                      Sitemap
                    </Link>
                  </footer>
                  <NetworkStatus />
                  <Toaster />
                  <NetworkStatusHandler />
                </ClientWrapper>
              </BookmarksProvider>
            </UserProvider>
          </ThemeProvider>
        </ConsentManager>
      </body>
    </html>
  );
}
