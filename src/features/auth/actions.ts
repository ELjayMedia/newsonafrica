'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/server/audit';
import { guard } from '@/server/security/ratelimit';
import { email as emailSchema } from '@/server/validation';

export async function signInWithEmail(email: string) {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) throw new Error('Invalid email');
  const req = new Request('http://local', { headers: headers() });
  const g = await guard(req, 'otp');
  if (!g.ok) throw new Error('Too many requests');
  const s = createSupabaseServer();
  await logAudit(req, 'auth.signin_start');
  const { error } = await s.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) throw error;
  await logAudit(req, 'auth.signin_success');
  redirect('/check-email');
}

export async function signOut() {
  const s = createSupabaseServer();
  await s.auth.signOut();
  redirect('/');
}
