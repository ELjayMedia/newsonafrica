import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError, successResponse } from '@/lib/api-utils';
import { logAudit } from '@/server/audit';
import { guard } from '@/server/security/ratelimit';
import { createProfile, ProfileServiceError } from '@/services/profile-service';

export const runtime = 'nodejs';

// Input validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 'otp');
    if (!g.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // Validate request body
    const { email, password, username } = registerSchema.parse(body);

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Create the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (authError) {
      return handleApiError(new Error(authError.message));
    }

    // Create the profile
    if (authData.user) {
      try {
        await createProfile(authData.user.id, {
          username,
          email,
        });
      } catch (error) {
        if (error instanceof ProfileServiceError) {
          return handleApiError(error);
        }
        throw error;
      }
    }

    await logAudit(request, 'auth.register');
    return successResponse({
      user: authData.user,
      session: authData.session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
