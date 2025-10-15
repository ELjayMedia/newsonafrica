import { createHmac } from "crypto"
import { WP_AUTH_CONFIG } from "./wp-auth-config"
import { getRestBase } from "@/lib/wp-endpoints"
import { env } from "@/config/env"

function encodeBasicAuth(username: string, password: string) {
  const bufferCtor = (globalThis as { Buffer?: { from(value: string): { toString(encoding: string): string } } }).Buffer
  if (bufferCtor?.from) {
    return bufferCtor.from(`${username}:${password}`).toString("base64")
  }
  const btoaFn = (globalThis as { btoa?: (value: string) => string }).btoa
  if (typeof btoaFn === "function") {
    return btoaFn(`${username}:${password}`)
  }
  throw new Error("Unable to encode WordPress credentials: no base64 encoder available")
}

// Function to generate a WordPress authentication token
export function generateWPAuthToken(userId: string, expiration: number): string {
  const key = WP_AUTH_CONFIG.AUTH_KEY + WP_AUTH_CONFIG.AUTH_SALT
  const hash = createHmac("sha256", key).update(`${userId}|${expiration}`).digest("hex")

  return `${userId}|${expiration}|${hash}`
}

// Function to verify a WordPress authentication token
export function verifyWPAuthToken(token: string): boolean {
  const [userId, expiration, hash] = token.split("|")

  if (!userId || !expiration || !hash) {
    return false
  }

  const currentTime = Math.floor(Date.now() / 1000)
  if (Number.parseInt(expiration) < currentTime) {
    return false
  }

  const expectedHash = generateWPAuthToken(userId, Number.parseInt(expiration)).split("|")[2]
  return hash === expectedHash
}

// Function to create a WordPress user
export async function createWPUser(username: string, email: string, password: string): Promise<any> {
  const rest = getRestBase()
  const appUsername = env.WP_APP_USERNAME
  const appPassword = env.WP_APP_PASSWORD
  if (!appUsername || !appPassword) {
    throw new Error("WordPress application credentials are not configured")
  }
  const basicAuth = encodeBasicAuth(appUsername, appPassword)
  const response = await fetch(`${rest}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to create WordPress user")
  }

  return response.json()
}

// Function to authenticate a WordPress user
export async function authenticateWPUser(username: string, password: string): Promise<any> {
  const rest = getRestBase()
  const baseUrl = rest.replace(/\/wp-json\/wp\/v2$/, "")
  const response = await fetch(`${baseUrl}/jwt-auth/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to authenticate WordPress user")
  }

  return response.json()
}
