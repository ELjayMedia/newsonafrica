'use client';

import type { ReactNode } from 'react';
import { use, useEffect } from 'react';

import CountryNav from './CountryNav';

import { ensureGPTLoaded } from '@/features/ads/gpt';
import { useAdsEnabled } from '@/features/ads/policy';
import { buildAdTargeting } from '@/features/ads/targeting';
import { waitForTcfConsent } from '@/features/consent/ConsentManager';

export default function CountryLayout({
  params,
  children,
}: {
  params: Promise<{ country: string }>;
  children: ReactNode;
}) {
  const { country } = use(params);
  const adsEnabled = useAdsEnabled();

  useEffect(() => {
    if (!adsEnabled) return;
    let cancelled = false;
    waitForTcfConsent().then((canServeAds) => {
      if (!canServeAds || cancelled) return;
      ensureGPTLoaded();
      const g = (window as Window & { googletag: googletag.Googletag }).googletag;
      g.cmd.push(() => {
        const kv = buildAdTargeting({ country });
        Object.entries(kv).forEach(([k, v]) =>
          g.pubads().setTargeting(k, Array.isArray(v) ? v : [v]),
        );
        g.pubads().enableSingleRequest();
        g.enableServices();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [adsEnabled, country]);

  return (
    <div>
      <nav className="p-4 border-b mb-4">
        <CountryNav country={country} />
      </nav>
      {children}
    </div>
  );
}
