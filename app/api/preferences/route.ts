import { NextResponse } from "next/server"

import { getUserPreferences } from "@/app/actions/preferences"
import { DEFAULT_USER_PREFERENCES } from "@/types/user-preferences"

export const dynamic = "force-dynamic"

export async function GET() {
  const result = await getUserPreferences()

  if (result.error) {
    const status = result.error.status ?? 500
    return NextResponse.json(
      { error: result.error.message },
      { status },
    )
  }

  const fallback = {
    userId: null,
    preferences: { ...DEFAULT_USER_PREFERENCES },
    profilePreferences: {},
  }

  return NextResponse.json(result.data ?? fallback)
}
