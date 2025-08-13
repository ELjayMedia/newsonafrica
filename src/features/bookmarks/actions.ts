'use server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { tag } from '@/lib/cache/tags';

export async function toggleBookmark(slug: string) {
  const s = createSupabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const ex = await s
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .maybeSingle();
  if (ex.data) {
    await s.from('bookmarks').delete().eq('id', ex.data.id);
  } else {
    await s.from('bookmarks').insert({ user_id: user.id, slug });
  }
  revalidateTag(tag.bookmarks(user.id));
}

export async function getBookmarks() {
  const s = createSupabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [] as string[];
  const { data } = await s
    .from('bookmarks')
    .select('slug')
    .eq('user_id', user.id);
  return data?.map((d) => d.slug) ?? [];
}
