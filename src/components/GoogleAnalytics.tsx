'use client';

import { useEffect } from 'react';

import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function GoogleAnalytics() {
  useGoogleAnalytics();

  useEffect(() => {
    if (typeof window.gtag !== 'function') {
      console.warn('Google Analytics not loaded');
    }
  }, []);

  return null;
}
