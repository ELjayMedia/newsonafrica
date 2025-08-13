'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ConsentState = {
  canServeAds: boolean;
  gdprApplies: boolean;
};

type ConsentContextValue = ConsentState & {
  setConsent: (next: ConsentState) => void;
};

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

function detectEea(): boolean {
  if (typeof navigator === 'undefined') return false;
  const lang = navigator.language || '';
  const region = lang.split('-')[1]?.toUpperCase();
  const eea = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ];
  if (region && eea.includes(region)) return true;
  if (typeof window !== 'undefined') {
    if ((window as any).__geoEea === 1) return true;
    const attr = document.documentElement.getAttribute('data-geo-eea');
    if (attr === '1') return true;
  }
  return false;
}

export function ConsentManager({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(() => {
    if (typeof window === 'undefined') {
      return { gdprApplies: false, canServeAds: true };
    }
    try {
      const stored = localStorage.getItem('noa.consent.tcf');
      if (stored) return JSON.parse(stored) as ConsentState;
    } catch {}
    const eea = detectEea();
    return { gdprApplies: eea, canServeAds: eea ? false : true };
  });

  const value: ConsentContextValue = {
    ...consent,
    setConsent: (next) => setConsent(next),
  };

  const showBanner = consent.gdprApplies && !consent.canServeAds;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('noa.consent.tcf', JSON.stringify(consent));
    } catch {}
    const evt = new CustomEvent('__noaConsent', { detail: consent });
    window.dispatchEvent(evt);
    (window as any).__noaConsent = {
      get: () => consent,
      set: (next: ConsentState) => setConsent(next),
    };
  }, [consent]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 bg-white p-4 text-center shadow-md">
          <p className="text-sm">We use cookies to personalize content and ads. Manage your consent.</p>
          <div className="flex gap-4">
            <button
              className="rounded bg-black px-4 py-2 text-white"
              onClick={() => setConsent({ ...consent, canServeAds: true })}
            >
              Accept
            </button>
            <a href="/privacy/consent" className="rounded border px-4 py-2">
              Manage
            </a>
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentManager');
  return ctx;
}
