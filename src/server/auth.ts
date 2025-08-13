import 'server-only';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function getSessionUser() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}
