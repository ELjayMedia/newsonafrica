import 'server-only';

export const dynamic = 'force-dynamic';

import { getFeatureFlag } from '@/lib/flags';
import { createSupabaseServer } from '@/lib/supabase/server';
import { WPR } from '@/lib/wp-client/rest';
import { getSessionUser } from '@/server/auth';
import type { Article } from '@/types/article';

export default async function ForYouSlot({ country }: { country: string }) {
  const enabled = await getFeatureFlag('foryou', country);
  if (!enabled) return null;

  const user = await getSessionUser();
  if (!user) return null;
  const s = createSupabaseServer();
  const { data } = await s.from('bookmarks').select('slug').eq('user_id', user.id).limit(50);
  const slugs = data?.map((d) => d.slug) ?? [];
  const items = (await WPR.latest({ country, limit: 6, revalidate: 60 })) as Article[];
  const filtered = items.filter((i) => !slugs.includes(i.slug)).slice(0, 6);
  return (
    <section aria-label="For you" className="mt-8">
      <h2 className="text-xl font-bold mb-4">For you</h2>
      <ul className="list-disc pl-4 space-y-1">
        {filtered.map((i) => (
          <li key={i.slug}>{i.title}</li>
        ))}
      </ul>
    </section>
  );
}
