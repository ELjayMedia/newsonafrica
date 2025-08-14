'use server';
import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

import { tag } from '@/lib/cache/tags';
import { createSupabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/server/audit';
import { guard } from '@/server/security/ratelimit';
import { slug as slugSchema } from '@/server/validation';

export async function toggleBookmark(slug: string) {
  const req = new Request('http://local', { headers: headers() });
  const g = await guard(req, 'bookmark');
  if (!g.ok) throw new Error('Too many requests');
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) throw new Error('Invalid slug');
  const s = createSupabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const ex = await s
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', parsed.data)
    .maybeSingle();
  if (ex.data) {
    await s.from('bookmarks').delete().eq('id', ex.data.id);
  } else {
    await s.from('bookmarks').insert({ user_id: user.id, slug: parsed.data });
  }
  await logAudit(req, 'bookmark.toggle');
  revalidateTag(tag.bookmarks(user.id));
}

export async function getBookmarks() {
  const s = createSupabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) return [] as string[];
  const { data } = await s.from('bookmarks').select('slug').eq('user_id', user.id);
  return data?.map((d) => d.slug) ?? [];
}
