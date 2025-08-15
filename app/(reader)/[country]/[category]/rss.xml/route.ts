import { NextResponse } from 'next/server';
import { WPR } from '@/lib/wp-client/rest';
import { canonicalUrl } from '@/lib/seo/meta';

export const revalidate = 3600;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ country: string; category: string }> },
) {
  const { country, category } = await params;
  const posts = await WPR.list({ country, categorySlug: category, perPage: 20 });
  const items = posts
    .map((p) => {
      const link = canonicalUrl(country, `/${category}/${p.slug}`);
      return `<item><title><![CDATA[${p.title}]]></title><link>${link}</link><guid>${p.id}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description><![CDATA[${p.excerpt || ''}]]></description>${p.image ? `<enclosure url="${p.image.src}" />` : ''}</item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>News On Africa – ${category.toUpperCase()}</title><link>${canonicalUrl(country, `/${category}`)}</link><description>Latest news</description>${items}</channel></rss>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
