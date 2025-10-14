import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabaseClient"

type MagicLinkPayload = {
  email?: string
}

export async function POST(request: NextRequest) {
  let payload: MagicLinkPayload

  try {
    payload = (await request.json()) as MagicLinkPayload
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 })
  }

  const email = payload.email?.trim()
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 })
  }

  try {
    const supabase = createServerSupabase()
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      return NextResponse.json({ message: error.message }, { status: error.status ?? 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Failed to send magic link", error)
    return NextResponse.json({ message: "Failed to send magic link." }, { status: 500 })
  }
}
