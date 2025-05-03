import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"
import { updateUserProfile } from "@/lib/wordpress-api"
import { writeFile } from "fs/promises"
import path from "path"

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

    // Save the file
    const filename = `${Date.now()}-${file.name}`
    const filepath = path.join(process.cwd(), "public", "uploads", filename)
    await writeFile(filepath, buffer)

    // Update user profile with new avatar URL
    const avatarUrl = `/uploads/${filename}`
    await updateUserProfile(token, { avatar_url: avatarUrl })

    return NextResponse.json({ success: true, avatarUrl })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
