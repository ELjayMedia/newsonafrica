import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

type UserImportData = {
  email: string
  full_name?: string
  username?: string
  role?: string
  status?: string
  country?: string
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  // Check if user is authenticated and is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  try {
    const { users } = await request.json()

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "No users provided" }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; email: string; error: string }>,
    }

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const userData = users[i]

      try {
        // Validate required fields
        if (!userData.email) {
          throw new Error("Email is required")
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("email", userData.email)
          .maybeSingle()

        if (existingUser) {
          // Update existing user
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              full_name: userData.full_name || existingUser.full_name,
              username: userData.username || existingUser.username,
              role: userData.role?.toLowerCase() || existingUser.role,
              status: userData.status?.toLowerCase() || existingUser.status,
              country: userData.country || existingUser.country,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingUser.id)

          if (updateError) throw updateError
        } else {
          // Create new user with auth
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            email_confirm: true,
            user_metadata: {
              full_name: userData.full_name,
            },
            password: generateTemporaryPassword(), // Generate a secure random password
          })

          if (authError) throw authError

          // Update the profile with additional data
          if (authUser?.user) {
            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                full_name: userData.full_name || null,
                username: userData.username || null,
                role: userData.role?.toLowerCase() || "user",
                status: userData.status?.toLowerCase() || "active",
                country: userData.country || null,
              })
              .eq("id", authUser.user.id)

            if (profileError) throw profileError
          }
        }

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push({
          row: i + 1,
          email: userData.email || `Row ${i + 1}`,
          error: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("User import error:", error)
    return NextResponse.json({ error: error.message || "Failed to process user import" }, { status: 500 })
  }
}

// Helper function to generate a secure random password
function generateTemporaryPassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+"
  let password = ""
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }
  return password
}
