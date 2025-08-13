import 'server-only';
export const dynamic = 'force-dynamic';
import { getSessionUser } from '@/server/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { WPR } from '@/lib/wp-client/rest';

export default async function ForYouSlot({ country }: { country: string }) {
  const user = await getSessionUser();
  if (!user) return null;
  const s = createSupabaseServer();
  const { data } = await s
    .from('bookmarks')
    .select('slug')
    .eq('user_id', user.id)
    .limit(50);
  const slugs = data?.map(d => d.slug) ?? [];
  const items = await WPR.latest({ country, limit: 6, revalidate: 60 });
  return (
    <section aria-label="For you" className="mt-8">
      <h2 className="text-xl font-bold mb-4">For you</h2>
      <ul className="list-disc pl-4 space-y-1">
        {items.slice(0, 6).map((i: any) => (
          <li key={i.slug}>{i.title}</li>
        ))}
      </ul>
    </section>
  );
}
