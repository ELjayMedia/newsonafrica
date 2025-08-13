'use server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { getSessionUser } from '@/server/auth';

export async function updateProfile(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  const updates = {
    display_name: formData.get('display_name') as string | null,
    country: formData.get('country') as string | null,
    avatar_url: formData.get('avatar_url') as string | null,
  };
  const s = createSupabaseServer();
  const { error } = await s
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
  if (error) throw error;
}
