import type { MetadataRoute } from 'next';
import { COUNTRIES } from '@/config/countries';

export const revalidate = 60 * 60; // 1h

export default function sitemap(): MetadataRoute.Sitemap {
  return COUNTRIES.flatMap(country => [
    { url: `https://newsonafrica.com/${country}/sitemap.xml` },
    { url: `https://newsonafrica.com/${country}/news-sitemap.xml` },
  ]);
}
