import type { ConsentState } from '@/features/consent/ConsentManager';

interface NoaConsentAPI {
  get: () => ConsentState;
  set: (next: ConsentState) => void;
}

declare global {
  interface Window {
    googletag?: googletag.Googletag;
    __noaConsent?: NoaConsentAPI;
    __geoEea?: number;
  }
}

export {};
