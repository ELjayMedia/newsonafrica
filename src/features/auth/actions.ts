'use server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkRateLimit, formatRetryMessage } from '@/lib/rate-limit-utils';

export async function signInWithEmail(email: string) {
  const ip = headers().get('x-forwarded-for') ?? 'unknown';
  const key = `otp:${email}:${ip}`;
  const { isLimited, retryAfter } = checkRateLimit(key, 5, 15 * 60 * 1000);
  if (isLimited) {
    throw new Error(formatRetryMessage(retryAfter));
  }
  const s = createSupabaseServer();
  const { error } = await s.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) throw error;
  redirect('/check-email');
}

export async function signOut() {
  const s = createSupabaseServer();
  await s.auth.signOut();
  redirect('/');
}
