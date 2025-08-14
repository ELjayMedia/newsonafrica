import type { MetadataRoute } from 'next';

import { COUNTRIES } from '@/config/countries';

// Next.js requires this value to be a literal.
export const revalidate = 3600; // 1h

export default function sitemap(): MetadataRoute.Sitemap {
  return COUNTRIES.flatMap((country) => [
    { url: `https://newsonafrica.com/${country}/sitemap.xml` },
    { url: `https://newsonafrica.com/${country}/news-sitemap.xml` },
  ]);
}
