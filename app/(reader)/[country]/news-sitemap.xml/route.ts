import { NextResponse } from 'next/server';
import { jfetch } from '@/lib/http/fetcher';
import { wpRestBase } from '@/lib/wp-client/base';

export const revalidate = 3600; // 1h

export async function GET(request: Request, { params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const base = `https://newsonafrica.com/${country}`;
  const posts = await jfetch<any[]>(`${wpRestBase(country)}/posts?per_page=100&_embed=true`);
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const items = posts
    .filter((p) => new Date(p.date).getTime() > cutoff)
    .slice(0, 1000)
    .map((p) => {
      const title = (p.title?.rendered || '').replace(/<[^>]+>/g, '');
      const catSlug = p._embedded?.['wp:term']?.[0]?.[0]?.slug;
      const url = `${base}/${catSlug}/${p.slug}`;
      return `<url><loc>${url}</loc><news:news><news:publication><news:name>News On Africa – ${country.toUpperCase()}</news:name><news:language>en</news:language></news:publication><news:publication_date>${p.date}</news:publication_date><news:title>${title}</news:title></news:news></url>`;
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items.join('')}</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
