import { getWpEndpoints } from "@/config/wp"
import logger from '@/utils/logger'

const { rest } = getWpEndpoints()
const WORDPRESS_API_URL = rest.replace(/\/wp-json\/wp\/v2$/, "")

if (!WORDPRESS_API_URL) {
  logger.error("WORDPRESS_API_URL is not set in the environment variables.")
}

export async function signIn(username: string, password: string) {
  try {
    // Check if API URL is defined
    if (!WORDPRESS_API_URL) {
      logger.error("WORDPRESS_API_URL is not defined in environment variables")
      throw new Error("API configuration error")
    }

    logger.debug("Attempting to sign in with WordPress API URL:", WORDPRESS_API_URL)

    const response = await fetch(`${WORDPRESS_API_URL}/jwt-auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    // Log response status to help with debugging
    logger.debug("Authentication response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      logger.error("Authentication error details:", errorData)
      throw new Error(errorData?.message || "Authentication failed")
    }

    const data = await response.json()
    return {
      authToken: data.token,
      user: {
        id: data.user_id,
        name: data.user_display_name,
        email: data.user_email,
      },
    }
  } catch (error) {
    logger.error("Login error:", error)

    // Provide more specific error messages based on the error type
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Unable to connect to authentication service. Please check your network connection.")
    }

    throw new Error(error instanceof Error ? error.message : "Authentication failed")
  }
}

export async function getCurrentUser(token: string) {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/wp-json/wp/v2/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user data")
    }

    const userData = await response.json()
    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
    }
  } catch (error) {
    logger.error("Error fetching current user:", error)
    throw error
  }
}

export async function signUp(username: string, email: string, password: string) {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/wp-json/wp/v2/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${process.env.WP_APP_USERNAME}:${process.env.WP_APP_PASSWORD}`)}`,
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    })

    if (!response.ok) {
      throw new Error("Registration failed")
    }

    const userData = await response.json()
    return {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      },
    }
  } catch (error) {
    logger.error("Registration error:", error)
    throw new Error("Registration failed")
  }
}

export async function resetPassword(email: string) {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/wp-json/wp/v2/users/lost-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_login: email,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send reset password email")
    }

    return { success: true }
  } catch (error) {
    logger.error("Reset password error:", error)
    throw new Error("Reset password request failed")
  }
}

export async function getAuthToken(request: Request) {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=")
      acc[key] = value
      return acc
    },
    {} as Record<string, string>,
  )

  return cookies.auth_token || null
}

export async function signOut() {
  // Clear auth token from cookies
  if (typeof document !== "undefined") {
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  }
  return { success: true }
}
