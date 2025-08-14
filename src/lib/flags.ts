import 'server-only';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getFeatureFlag(name: string, country?: string): Promise<boolean> {
  const params = new URLSearchParams({
    name: `eq.${name}`,
    select: 'name,enabled,country',
  });
  const url = `${SUPABASE_URL}/rest/v1/feature_flags?${params.toString()}`;
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    ...(country ? { cache: 'no-store' as const } : { next: { revalidate: 60 } }),
  };
  const res = await fetch(url, init);
  if (!res.ok) {
    console.error('Failed to fetch feature flag', name, res.statusText);
    return false;
  }
  type Row = { name: string; enabled: boolean; country: string | null };
  const data = (await res.json()) as Row[];
  const match = data.find((f) => f.country === country) ?? data.find((f) => f.country == null);
  return Boolean(match?.enabled);
}
