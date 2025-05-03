import { NextResponse } from "next/server"
import { getAuthTokenFromCookies } from "@/lib/cookies"
import jwt from "jsonwebtoken"

const DISQUS_SECRET_KEY = process.env.DISQUS_SECRET_KEY
const DISQUS_PUBLIC_KEY = process.env.DISQUS_PUBLIC_KEY

if (!DISQUS_SECRET_KEY || !DISQUS_PUBLIC_KEY) {
  console.error("Missing Disqus API keys")
}

export async function GET(request: Request) {
  const token = getAuthTokenFromCookies()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }

    // Fetch user details from your database or WordPress API
    const userDetails = await fetchUserDetails(user.userId)

    const disqusData = {
      id: userDetails.id,
      username: userDetails.username,
      email: userDetails.email,
      avatar: userDetails.avatar,
    }

    const disqusToken = jwt.sign(disqusData, DISQUS_SECRET_KEY as string, { algorithm: "HS256" })

    const payload = Buffer.from(JSON.stringify(disqusData)).toString("base64")
    const signature = jwt.sign(payload, DISQUS_SECRET_KEY as string, { algorithm: "HS256" })

    // Replace the existing token verification with:
    const DISQUS_API_KEY = "1DF0M1vk3m8HxDxxrl51VIewQvTwLMqN6VuxBp4zffGjMOMbSK1ygEaEvAt7sDOs"
    const DISQUS_API_SECRET = "zkyNhIq0Ke2kyHwI1VAR2EiQ3PywvqnEcF2z7hhBiahRDQCgZxDRuh1ADdTN7Ujb"
    const DISQUS_ACCESS_TOKEN = "04e65380d0504f91b442b2a2a1c9f31f"

    const authData = {
      api_key: DISQUS_API_KEY,
      api_secret: DISQUS_API_SECRET,
      access_token: DISQUS_ACCESS_TOKEN,
      // Add OAuth endpoints
      auth_url: "https://disqus.com/api/oauth/2.0/authorize/",
      token_url: "https://disqus.com/api/oauth/2.0/access_token/",
      callback_url: "https://app.newsonafrica.com/",
    }

    return NextResponse.json(authData)
  } catch (error) {
    console.error("Disqus auth error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function fetchUserDetails(userId: string) {
  // Implement this function to fetch user details from your database or WordPress API
  // Return an object with id, username, email, and avatar properties
  return {
    id: userId,
    username: "user",
    email: "user@example.com",
    avatar: "https://example.com/avatar.jpg",
  }
}
