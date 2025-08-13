'use client';

export function shouldLoadAds() {
  const c: any = (navigator as any).connection;
  if (c?.saveData) return false;
  if (typeof c?.effectiveType === 'string' && c.effectiveType.includes('2g')) return false;
  return true;
}

export function useAdsEnabled() {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  const kill =
    qs.get('ads') === 'off' || process.env.NEXT_PUBLIC_ADS_ENABLED === 'false';
  return !kill && shouldLoadAds();
}

export function isAdDebug() {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  return qs.get('ads') === 'debug';
}
