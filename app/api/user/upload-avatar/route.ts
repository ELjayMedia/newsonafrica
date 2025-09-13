import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"
import { updateUserProfile } from "@/lib/wordpress-api"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import logger from '@/utils/logger'

export async function POST(request: Request) {
  const token = getAuthTokenFromCookies()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
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

    return NextResponse.json({ success: true, avatarUrl })
  } catch (error) {
    logger.error("Error uploading avatar:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
