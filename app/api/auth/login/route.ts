import type { NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { applyRateLimit, handleApiError, successResponse } from "@/lib/api-utils"

// Input validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 5, "LOGIN_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()

    // Validate request body
    const { email, password } = loginSchema.parse(body)

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return handleApiError(new Error(error.message))
    }

    return successResponse({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
