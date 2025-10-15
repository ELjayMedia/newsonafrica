import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { updateUserProfile } from "@/lib/supabase"
import { writeFile, mkdir } from "node:fs/promises"
import path from "path"
import { existsSync } from "node:fs"
import { revalidatePath } from "next/cache"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

export async function POST(request: Request) {
  logRequest(request)
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return jsonWithCors(request, { error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return jsonWithCors(request, { error: "No file uploaded" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save the file
    const filename = `${Date.now()}-${file.name}`
    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Update user profile with new avatar URL
    const avatarUrl = `/uploads/${filename}`

    let updatedAvatarUrl = avatarUrl
    try {
      const updatedProfile = await updateUserProfile(user.id, { avatar_url: avatarUrl })
      updatedAvatarUrl = updatedProfile.avatar_url ?? avatarUrl
    } catch (error) {
      console.error("Failed to update Supabase profile avatar", error)

      return jsonWithCors(
        request,
        { error: error instanceof Error ? error.message : "Failed to update profile" },
        { status: 502 },
      )
    }

    revalidateByTag(CACHE_TAGS.USERS)
    revalidatePath("/profile")

    return NextResponse.json({ success: true, avatarUrl: updatedAvatarUrl })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return jsonWithCors(request, { error: "Failed to upload avatar" }, { status: 500 })
  }
}
