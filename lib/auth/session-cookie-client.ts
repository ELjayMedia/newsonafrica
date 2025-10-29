import type { SessionCookieProfile } from "@/lib/auth/session-cookie"

export const SESSION_COOKIE_ENDPOINT = "/api/auth/session"

export async function fetchSessionCookie(): Promise<SessionCookieProfile | null> {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const response = await fetch(SESSION_COOKIE_ENDPOINT, { credentials: "include" })

    if (!response.ok) {
      return null
    }

    const { data } = (await response.json()) as { data: SessionCookieProfile | null }
    return data ?? null
  } catch (error) {
    console.error("Failed to read session cookie", error)
    return null
  }
}

export async function persistSessionCookie(profile: SessionCookieProfile): Promise<void> {
  if (typeof window === "undefined") {
    return
  }

  try {
    await fetch(SESSION_COOKIE_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    })
  } catch (error) {
    console.error("Failed to persist session cookie", error)
  }
}

export async function clearSessionCookieClient(): Promise<void> {
  if (typeof window === "undefined") {
    return
  }

  try {
    await fetch(SESSION_COOKIE_ENDPOINT, { method: "DELETE", credentials: "include" })
  } catch (error) {
    console.error("Failed to clear session cookie", error)
  }
}
