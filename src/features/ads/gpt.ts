export {};

declare global {
  interface Window {
    googletag?: any;
    __noaConsent?: any;
  }
}

let loaded = false;

export function ensureGPTLoaded() {
  if (loaded || typeof window === 'undefined') return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
  s.onload = () => {
    loaded = true;
  };
  document.head.appendChild(s);
  window.googletag = window.googletag || { cmd: [] };
}
