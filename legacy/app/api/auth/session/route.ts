import { NextResponse } from "next/server"

import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
  type SessionCookieProfile,
} from "@/lib/auth/session-cookie"

export async function GET() {
  const { payload, stale } = await readSessionCookie()
  return NextResponse.json({
    data: payload,
    stale,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SessionCookieProfile> | null

    if (!body?.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const profile: SessionCookieProfile = {
      userId: body.userId,
      username: body.username ?? null,
      avatar_url: body.avatar_url ?? null,
      role: body.role ?? null,
      created_at: body.created_at ?? null,
      updated_at: body.updated_at ?? null,
    }

    const success = await writeSessionCookie(profile)

    if (!success) {
      return NextResponse.json({ error: "Unable to persist session cookie" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update session cookie", error)
    return NextResponse.json({ error: "Failed to update session cookie" }, { status: 500 })
  }
}

export async function DELETE() {
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
