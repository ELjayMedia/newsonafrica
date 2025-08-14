'use client';

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorConnection extends Navigator {
  connection?: NetworkInformation;
}

export function shouldLoadAds() {
  const connection = (navigator as NavigatorConnection).connection;
  if (connection?.saveData) return false;
  if (typeof connection?.effectiveType === 'string' && connection.effectiveType.includes('2g'))
    return false;
  return true;
}

export function useAdsEnabled() {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  const kill = qs.get('ads') === 'off' || process.env.NEXT_PUBLIC_ADS_ENABLED === 'false';
  return !kill && shouldLoadAds();
}

export function isAdDebug() {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  return qs.get('ads') === 'debug';
}
