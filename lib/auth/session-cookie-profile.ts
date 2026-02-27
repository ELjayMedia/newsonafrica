import type { SessionCookieProfile } from "@/lib/auth/session-cookie"

type SessionCookieProfileInput = {
  userId?: unknown
  id?: unknown
  username?: unknown
  email?: unknown
  avatar_url?: unknown
  role?: unknown
  created_at?: unknown
  updated_at?: unknown
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function toSessionCookieProfile(user: SessionCookieProfileInput): SessionCookieProfile {
  return {
    userId: toStringOrEmpty(user.userId ?? user.id),
    username: toStringOrNull(user.username) ?? toStringOrNull(user.email),
    avatar_url: toStringOrNull(user.avatar_url),
    role: toStringOrNull(user.role),
    created_at: toStringOrNull(user.created_at),
    updated_at: toStringOrNull(user.updated_at),
  }
}
