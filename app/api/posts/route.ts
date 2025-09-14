import { NextResponse } from 'next/server';
import { getPostsByCountry } from '@/lib/wp-data';

export const revalidate = 60;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const country = (u.searchParams.get('country') || 'DEFAULT').toUpperCase();
  const section = u.searchParams.get('section') || undefined;
  try {
    const posts = await getPostsByCountry(country, { category: section, first: 20 });
    return NextResponse.json(posts?.nodes ?? []);
  } catch {
    return NextResponse.json([], { status: 200, headers: { 'x-gql-fallback': 'true' } });
  }
}
