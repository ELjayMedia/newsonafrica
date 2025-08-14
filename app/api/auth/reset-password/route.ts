import { NextResponse } from 'next/server';

import { resetPassword } from '@/lib/auth';
import { logAudit } from '@/server/audit';
import { guard } from '@/server/security/ratelimit';
import { email as emailSchema } from '@/server/validation';

export async function POST(request: Request) {
  try {
    const g = await guard(request, 'otp');
    if (!g.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    const { email } = await request.json();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const result = await resetPassword(parsed.data);
    await logAudit(request, 'auth.reset_password');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to send reset password email' }, { status: 400 });
  }
}
