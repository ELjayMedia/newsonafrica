import type { MetadataRoute } from 'next';

import { siteConfig } from '@/config/site';
import { COUNTRIES } from '@/config/countries';
import { wp } from '@/lib/wp-client/rest';

export const revalidate = 60 * 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url || 'https://newsonafrica.com';

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl },
  ];

  const countryEntries = await Promise.all(
    COUNTRIES.map(async (country) => {
      const list: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/${country}` },
      ];

      try {
        const posts = (await wp.list(country, undefined, {
          revalidate: 60 * 60,
        })) as any[];

        posts?.forEach((post: any) => {
          const category = post.categories?.nodes?.[0]?.slug;
          const segments = [country, category, post.slug].filter(Boolean);
          list.push({
            url: `${baseUrl}/${segments.join('/')}`,
            lastModified: post.modified ? new Date(post.modified) : undefined,
          });
        });
      } catch (error) {
        // Ignore errors for individual country fetches to avoid failing the whole sitemap
        console.error('sitemap country error', country, error);
      }

      return list;
    }),
  );

  countryEntries.forEach((arr) => entries.push(...arr));

  return entries;
}

