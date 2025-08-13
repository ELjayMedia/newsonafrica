"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { buildAdTargeting } from "@/features/ads/targeting";
import { ensureGPTLoaded } from "@/features/ads/gpt";
import { useConsent } from "@/features/consent/ConsentManager";
import { useAdsEnabled } from "@/features/ads/policy";

export default function CountryLayout({
  params,
  children,
}: {
  params: { country: string };
  children: ReactNode;
}) {
  const { canServeAds } = useConsent();
  const adsEnabled = useAdsEnabled();

  useEffect(() => {
    if (!canServeAds || !adsEnabled) return;
    ensureGPTLoaded();
    const g = (window as any).googletag;
    g.cmd.push(() => {
      const kv = buildAdTargeting({ country: params.country });
      Object.entries(kv).forEach(([k, v]) =>
        g.pubads().setTargeting(k, Array.isArray(v) ? v : [v])
      );
      g.pubads().enableSingleRequest();
      g.enableServices();
    });
  }, [canServeAds, adsEnabled, params.country]);

  return (
    <div>
      <nav className="p-4 border-b mb-4">{/* TODO: country-specific nav for {params.country} */}</nav>
      {children}
    </div>
  );
}

