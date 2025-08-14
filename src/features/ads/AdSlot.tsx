'use client';

import { useEffect, useRef, useState } from 'react';

import { ensureGPTLoaded } from './gpt';
import { useAdsEnabled, isAdDebug } from './policy';

import { waitForTcfConsent } from '@/features/consent/ConsentManager';

export type AdProps = {
  id: string;
  slot: string;
  sizes: googletag.GeneralSize | googletag.GeneralSize[];
  sizeMapping?: googletag.SizeMappingArray;
  kv?: Record<string, string | string[]>;
  lazy?: boolean;
  collapseEmpty?: 'never' | 'after';
  minHeight?: number;
  className?: string;
};

export default function AdSlot({
  id,
  slot,
  sizes,
  sizeMapping,
  kv = {},
  lazy = true,
  collapseEmpty = 'after',
  minHeight = 100,
  className,
}: AdProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(!lazy);
  const adsEnabled = useAdsEnabled();
  const debug = isAdDebug();

  useEffect(() => {
    if (!lazy || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), {
      rootMargin: '300px',
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!inView || !adsEnabled) return;
    let cancelled = false;
    waitForTcfConsent().then((canServeAds) => {
      if (!canServeAds || cancelled) return;
      ensureGPTLoaded();
      const g = (window as Window & { googletag: googletag.Googletag }).googletag;
      g.cmd.push(() => {
        const ad = g.defineSlot(slot, sizes, id);
        if (!ad) return;
        if (sizeMapping) ad.defineSizeMapping(sizeMapping);
        ad.addService(g.pubads());
        Object.entries(kv).forEach(([k, v]) =>
          g.pubads().setTargeting(k, Array.isArray(v) ? v : [v]),
        );
        if (collapseEmpty === 'after') g.pubads().collapseEmptyDivs(true);
        g.enableServices();
        if (debug) console.log('Defining ad slot', id, slot, kv);
        g.display(id);
      });
    });
    return () => {
      cancelled = true;
      const g = (window as Window & { googletag?: googletag.Googletag }).googletag;
      g?.cmd?.push(() => {
        try {
          const slots = g
            .pubads()
            .getSlots()
            .filter((s: googletag.Slot) => s.getSlotElementId() === id);
          if (slots.length) g.destroySlots(slots);
          if (debug) console.log('Destroyed ad slot', id);
        } catch {}
      });
    };
  }, [inView, adsEnabled, id, slot, sizes, sizeMapping, collapseEmpty, kv, debug]);

  return (
    <div id={id} ref={ref} className={className} style={{ minHeight }} aria-label="advertisement" />
  );
}
