import { getSessionUser } from '@/server/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const s = createSupabaseServer();
  const { data } = await s
    .from('bookmarks')
    .select('slug')
    .eq('user_id', user.id);
  return (
    <main className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Bookmarked Articles</h1>
      <ul className="list-disc pl-4 space-y-2">
        {data?.map((b) => (
          <li key={b.slug}>{b.slug}</li>
        ))}
      </ul>
    </main>
  );
}
