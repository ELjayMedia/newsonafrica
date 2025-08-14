let loaded = false;

export function ensureGPTLoaded(): void {
  if (loaded || typeof window === 'undefined') return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
  s.onload = () => {
    loaded = true;
  };
  document.head.appendChild(s);
  window.googletag =
    window.googletag || ({ cmd: [] as googletag.CommandArray } as googletag.Googletag);
}
