import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"
import { updateUserProfile } from "@/lib/wordpress-api"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
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
  const token = await getAuthTokenFromCookies()
  if (!token) {
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
    await updateUserProfile(token, { avatar_url: avatarUrl })

    revalidateByTag(CACHE_TAGS.USERS)
    revalidatePath("/profile")

    return NextResponse.json({ success: true, avatarUrl })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return jsonWithCors(request, { error: "Failed to upload avatar" }, { status: 500 })
  }
}
