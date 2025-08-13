'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

export const useGoogleAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window.gtag === 'function') {
        window.gtag('config', 'G-S55PVESFS2', {
          page_path: url,
        });
      }
    };

    if (pathname) {
      handleRouteChange(pathname + searchParams.toString());
    }
  }, [pathname, searchParams]);
};
