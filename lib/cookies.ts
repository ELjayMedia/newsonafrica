import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

export async function getAuthTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("auth_token")?.value ?? null
}

export function getAuthTokenFromRequest(request: NextRequest) {
  return request.cookies.get("auth_token")?.value || null
}
