import { NextResponse } from "next/server"
import { resetPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const result = await resetPassword(email)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Failed to send reset password email" }, { status: 400 })
  }
}
