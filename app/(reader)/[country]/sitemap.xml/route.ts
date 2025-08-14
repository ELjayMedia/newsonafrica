import { NextResponse } from 'next/server';
import { jfetch } from '@/lib/http/fetcher';
import { wpRestBase } from '@/lib/wp-client/base';

export const revalidate = 3600; // 1h

export async function GET(request: Request, { params }: { params: { country: string } }) {
  const base = `https://newsonafrica.com/${params.country}`;
  const urls: string[] = [`${base}/`];
  try {
    const cats = await jfetch<any[]>(`${wpRestBase(params.country)}/categories?per_page=100`);
    cats.forEach(c => urls.push(`${base}/${c.slug}`));
  } catch {}
  try {
    const posts = await jfetch<any[]>(`${wpRestBase(params.country)}/posts?per_page=100&_embed=true`);
    posts.forEach(p => {
      const catSlug = p._embedded?.['wp:term']?.[0]?.[0]?.slug;
      const segments = [base, catSlug, p.slug].filter(Boolean);
      urls.push(segments.join('/'));
    });
  } catch {}
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .slice(0, 10000)
    .map(u => `<url><loc>${u}</loc></url>`)
    .join('')}</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
