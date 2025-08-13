export const COUNTRIES = ['za', 'ng', 'ke', 'gh', 'bw', 'zw', 'mz', 'ls', 'sz'] as const;
export type Country = typeof COUNTRIES[number];

// Normalize a path segment or header value to a supported country code.
// Defaults to 'sz' (Eswatini) when no match is found.
export function normalizeCountry(input?: string | null): Country {
  const seg = input?.toLowerCase().replace(/^\/+/g, '').split('/')[0];
  return COUNTRIES.includes(seg as Country) ? (seg as Country) : 'sz';
}

// Resolve the country from hostname + pathname using normalizeCountry.
export function resolveCountry(hostname: string, pathname: string): Country {
  const pathSeg = pathname.split('/').filter(Boolean)[0];
  if (pathSeg) return normalizeCountry(pathSeg);
  const sub = hostname.split('.')[0];
  return normalizeCountry(sub);
}
