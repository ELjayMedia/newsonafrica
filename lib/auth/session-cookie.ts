import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { appConfig } from "@/lib/config"

// Constants derived from centralized config
const {
  sessionCookieName: SESSION_COOKIE_NAME,
  sessionCookieTtlMs: SESSION_COOKIE_TTL_MS,
  sessionCookieMaxAgeSeconds: SESSION_COOKIE_MAX_AGE_SECONDS,
} = appConfig.auth

export { SESSION_COOKIE_NAME }

export interface SessionCookieProfile {
  userId: string
  username: string | null
  avatar_url: string | null
  role: string | null
  created_at: string | null
  updated_at: string | null
}

export interface SessionCookiePayload extends SessionCookieProfile {
  refreshedAt: number
}

function getSessionCookieSecret(): string | null {
  const secret = process.env.SESSION_COOKIE_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!secret) {
    console.warn("SESSION_COOKIE_SECRET is not configured. Session cookie signing is disabled.")
    return null
  }

  return secret
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

function encodePayload(payload: SessionCookiePayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(data, secret)
  return `${data}.${signature}`
}

function decodePayload(raw: string, secret: string): SessionCookiePayload | null {
  const [data, signature] = raw.split(".")

  if (!data || !signature) {
    return null
  }

  const expectedSignature = sign(data, secret)

  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(data, "base64url").toString())
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "string" ||
      typeof decoded.refreshedAt !== "number"
    ) {
      return null
    }

    return {
      userId: decoded.userId,
      username: decoded.username ?? null,
      avatar_url: decoded.avatar_url ?? null,
      role: decoded.role ?? null,
      created_at: decoded.created_at ?? null,
      updated_at: decoded.updated_at ?? null,
      refreshedAt: decoded.refreshedAt,
    }
  } catch (error) {
    console.error("Failed to decode session cookie", error)
    return null
  }
}

export function isSessionCookieStale(payload: SessionCookiePayload | null): boolean {
  if (!payload) {
    return true
  }

  return Date.now() - payload.refreshedAt > SESSION_COOKIE_TTL_MS
}

export async function readSessionCookie(): Promise<{
  payload: SessionCookiePayload | null
  stale: boolean
}> {
  try {
    const cookieStore = cookies()
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value

    const secret = getSessionCookieSecret()
    if (!raw || !secret) {
      return { payload: null, stale: true }
    }

    const payload = decodePayload(raw, secret)
    return { payload, stale: isSessionCookieStale(payload) }
  } catch (error) {
    console.error("Unable to read session cookie", error)
    return { payload: null, stale: true }
  }
}

export async function writeSessionCookie(profile: SessionCookieProfile): Promise<boolean> {
  const secret = getSessionCookieSecret()
  if (!secret) {
    return false
  }

  const payload: SessionCookiePayload = { ...profile, refreshedAt: Date.now() }
  const value = encodePayload(payload, secret)

  try {
    const cookieStore = cookies()
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    })
    return true
  } catch (error) {
    console.error("Unable to write session cookie", error)
    return false
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = cookies()
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 0,
    })
  } catch (error) {
    console.error("Unable to clear session cookie", error)
  }
}

export function parseSessionCookieValue(raw: string): {
  payload: SessionCookiePayload | null
  stale: boolean
} {
  const secret = getSessionCookieSecret()
  if (!secret) {
    return { payload: null, stale: true }
  }

  const payload = decodePayload(raw, secret)
  return { payload, stale: isSessionCookieStale(payload) }
}
