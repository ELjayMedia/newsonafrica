import path from "node:path"
import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"

import { revalidatePath } from "next/cache"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

import { getAuthTokenFromCookies } from "@/lib/cookies"
import { updateUserProfile } from "@/lib/wordpress-api"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

type UpdateUserProfileFn = (
  token: string,
  data: { avatar_url: string },
) => Promise<unknown>

export async function POST(request: Request) {
  logRequest(request)

  const token = await getAuthTokenFromCookies()
  if (!token) {
    return jsonWithCors(request, { error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
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
    const safeName = file.name.replace(/[^\w.\-]+/g, "_")
    const filename = `${Date.now()}-${safeName}`
    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Update user profile with new avatar URL
    const avatarUrl = `/uploads/${filename}`

    // NOTE: wordpress-api currently types updateUserProfile as 0-args.
    // This cast fixes TypeScript while remaining runtime-safe (extra args are ignored in JS).
    const update = updateUserProfile as unknown as UpdateUserProfileFn
    await update(token, { avatar_url: avatarUrl })

    revalidateByTag(CACHE_TAGS.USERS)
    revalidatePath("/profile")

    return jsonWithCors(request, { success: true, avatarUrl })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return jsonWithCors(request, { error: "Failed to upload avatar" }, { status: 500 })
  }
}
