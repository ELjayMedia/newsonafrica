import { NextResponse } from 'next/server';

import { siteConfig } from '@/config/site';

export async function GET() {
  const baseUrl = siteConfig.url || 'https://newsonafrica.com';

  const robotsTxt = `
# News on Africa Robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

# Sitemaps
Sitemap: ${baseUrl}/sitemap-index.xml
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/news-sitemap.xml
Sitemap: ${baseUrl}/server-sitemap.xml

Host: ${baseUrl}
  `.trim();

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
