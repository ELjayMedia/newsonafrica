import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError, successResponse } from '@/lib/api-utils';
import { logAudit } from '@/server/audit';
import { guard } from '@/server/security/ratelimit';

export const runtime = 'nodejs';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 'otp');
    if (!g.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // Validate request body
    const { email, password } = loginSchema.parse(body);

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return handleApiError(new Error(error.message));
    }

    await logAudit(request, 'auth.login');
    return successResponse({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
