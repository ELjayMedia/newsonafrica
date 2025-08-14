'use server';
import { headers } from 'next/headers';

import { createSupabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/server/audit';
import { getSessionUser } from '@/server/auth';
import { guard } from '@/server/security/ratelimit';
import { commentBody, stripHtml } from '@/server/validation';

const badWords = ['badword'];
function hasProfanity(text: string) {
  const lower = text.toLowerCase();
  return badWords.some((w) => lower.includes(w));
}

export async function submitComment(slug: string, articleId: string, body: string) {
  const req = new Request('http://local', { headers: headers() });
  const g = await guard(req, 'comment');
  if (!g.ok) throw new Error('Too many requests');
  if (hasProfanity(body)) {
    throw new Error('Comment contains disallowed language');
  }
  const parsed = commentBody.safeParse(stripHtml(body));
  if (!parsed.success) throw new Error('Invalid body');
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  const s = createSupabaseServer();
  const { error } = await s.from('comments').insert({
    article_id: articleId,
    user_id: user.id,
    body: parsed.data,
  });
  if (error) throw error;
  await logAudit(req, 'comment.submit');
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
