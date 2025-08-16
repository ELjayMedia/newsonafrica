import { NextResponse } from "next/server"
import { signUp, signIn } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { action, username, email, password } = await request.json()

    if (action === "signup") {
      try {
        const user = await signUp(username, email, password)
        return NextResponse.json({ success: true, user })
      } catch (error) {
        console.error("Signup error:", error)
        return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 400 })
      }
    }

    if (action === "signin") {
      try {
        const token = await signIn(username, password)
        cookies().set("auth_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 7, // 1 week
        })
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error("Signin error:", error)
        return NextResponse.json({ error: error.message || "Authentication failed" }, { status: 401 })
      }
    }

    if (action === "signout") {
      cookies().delete("auth_token")
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
