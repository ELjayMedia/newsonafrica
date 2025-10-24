import { env } from "@/config/env"

export function getWordPressAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  if (env.WORDPRESS_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${env.WORDPRESS_AUTH_TOKEN}`
  }

  return headers
}
