'use server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getSessionUser } from '@/server/auth';

const badWords = ['badword'];
function hasProfanity(text: string) {
  const lower = text.toLowerCase();
  return badWords.some(w => lower.includes(w));
}

export async function submitComment(slug: string, articleId: string, body: string) {
  if (hasProfanity(body)) {
    throw new Error('Comment contains disallowed language');
  }
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  const s = createSupabaseServer();
  const { error } = await s.from('comments').insert({
    article_id: articleId,
    user_id: user.id,
    body,
  });
  if (error) throw error;
}

export async function listComments(articleId: string) {
  const s = createSupabaseServer();
  const { data } = await s
    .from('comments')
    .select('id, body, created_at')
    .eq('article_id', articleId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  return data ?? [];
}
