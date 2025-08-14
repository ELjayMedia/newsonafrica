import { createSupabaseServer } from '@/lib/supabase/server';

export async function getSignedUrl(path: string, ttl: number) {
  const s = createSupabaseServer();
  const { data, error } = await s.storage.from('user-media').createSignedUrl(path, ttl);
  if (error || !data) throw error || new Error('sign url failed');
  return data.signedUrl;
}
