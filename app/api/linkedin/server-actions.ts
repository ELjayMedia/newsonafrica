"use server"

import { revalidatePath } from "next/cache"

/**
 * Server action to handle LinkedIn authentication
 * This keeps the API key secure on the server
 */
export async function authenticateWithLinkedIn(code: string) {
  try {
    const apiKey = process.env.LINKEDIN_API_KEY
    const apiSecret = process.env.LINKEDIN_API_SECRET

    if (!apiKey || !apiSecret) {
      throw new Error("LinkedIn API credentials not configured")
    }

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: apiKey,
        client_secret: apiSecret,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()
    return { success: true, data: tokenData }
  } catch (error) {
    console.error("LinkedIn authentication error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Server action to share content on LinkedIn
 */
export async function shareOnLinkedIn(accessToken: string, content: string, url?: string) {
  try {
    const shareResponse = await fetch("https://api.linkedin.com/v2/shares", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: "urn:li:person:me",
        text: { text: content },
        content: url
          ? {
              contentEntities: [
                {
                  entityLocation: url,
                },
              ],
            }
          : undefined,
        distribution: {
          linkedInDistributionTarget: {},
        },
      }),
    })

    if (!shareResponse.ok) {
      throw new Error("Failed to share content on LinkedIn")
    }

    const shareData = await shareResponse.json()
    revalidatePath("/profile")
    return { success: true, data: shareData }
  } catch (error) {
    console.error("LinkedIn share error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Server action to get LinkedIn profile information
 */
export async function getLinkedInProfile(accessToken: string) {
  try {
    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch LinkedIn profile")
    }

    const profileData = await profileResponse.json()
    return { success: true, data: profileData }
  } catch (error) {
    console.error("LinkedIn profile fetch error:", error)
    return { success: false, error: (error as Error).message }
  }
}
