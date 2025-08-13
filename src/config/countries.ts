export const COUNTRIES = ['za','ng','ke','gh','bw','zw','mz','ls','sz'] as const;
export type Country = typeof COUNTRIES[number];
export function resolveCountry(hostname: string, pathname: string): Country | null {
  const seg = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  const sub = hostname.split('.')[0].toLowerCase();
  if (seg && COUNTRIES.includes(seg as Country)) return seg as Country;
  if (COUNTRIES.includes(sub as Country)) return sub as Country;
  return 'sz'; // default Eswatini
}
