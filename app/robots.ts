import type { MetadataRoute } from 'next';

import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url || 'https://newsonafrica.com';

  return {
    rules: [{
      userAgent: '*',
      allow: '/',
    }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
