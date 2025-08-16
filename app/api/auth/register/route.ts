import type { NextRequest } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { z } from "zod"
import { createProfile } from "@/services/profile-service"
import { applyRateLimit, handleApiError, successResponse } from "@/lib/api-utils"

// Input validation schema
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 3, "REGISTER_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()

    // Validate request body
    const { email, password, username } = registerSchema.parse(body)

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Create the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    if (authError) {
      return handleApiError(new Error(authError.message))
    }

    // Create the profile
    if (authData.user) {
      const profile = await createProfile(authData.user.id, {
        username,
        email,
      })

      if (!profile) {
        return handleApiError(new Error("Failed to create user profile"))
      }
    }

    return successResponse({
      user: authData.user,
      session: authData.session,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
