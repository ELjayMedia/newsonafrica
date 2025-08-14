'use server';

import { headers } from 'next/headers';
import { z } from 'zod';

import { createSupabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/server/audit';
import { getSessionUser } from '@/server/auth';

const ProfileSchema = z.object({
  display_name: z.string().max(80).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export async function updateProfile(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  const updates = ProfileSchema.parse({
    display_name: formData.get('display_name'),
    country: formData.get('country'),
    avatar_url: formData.get('avatar_url'),
  });
  const s = createSupabaseServer();
  const { error } = await s.from('profiles').update(updates).eq('id', user.id);
  if (error) throw error;
  const req = new Request('http://local', { headers: headers() });
  await logAudit(req, 'profile.update');
}
