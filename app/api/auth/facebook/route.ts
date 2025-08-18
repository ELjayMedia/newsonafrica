import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { NextResponse } from "next/server"
import { GraphQLClient } from "graphql-request"
import jwt from "jsonwebtoken"

const WORDPRESS_API_URL = env.NEXT_PUBLIC_WORDPRESS_API_URL
const JWT_SECRET = env.JWT_SECRET
const FACEBOOK_APP_ID = env.NEXT_PUBLIC_FACEBOOK_APP_ID
const FACEBOOK_APP_SECRET = env.FACEBOOK_APP_SECRET

if (!WORDPRESS_API_URL || !JWT_SECRET || !FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
  throw new Error("Missing required environment variables")
}

const client = new GraphQLClient(WORDPRESS_API_URL)

const FACEBOOK_LOGIN_MUTATION = `
  mutation FacebookLogin($input: FacebookLoginInput!) {
    facebookLogin(input: $input) {
      authToken
      user {
        id
        name
        email
      }
    }
  }
`

async function verifyFacebookToken(accessToken: string, userID: string) {
  const response = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
  )
  const data = await response.json()

  if (data.data.is_valid && data.data.user_id === userID) {
    return true
  }
  return false
}

export async function POST(request: Request) {
  try {
    const { accessToken, userID } = await request.json()

    const isValidToken = await verifyFacebookToken(accessToken, userID)
    if (!isValidToken) {
      return NextResponse.json({ error: "Invalid Facebook token" }, { status: 401 })
    }

    const variables = {
      input: {
        accessToken,
        userId: userID,
      },
    }

    const data = await client.request(FACEBOOK_LOGIN_MUTATION, variables)

    if (data.facebookLogin && data.facebookLogin.authToken) {
      const token = jwt.sign({ userId: data.facebookLogin.user.id }, JWT_SECRET, { expiresIn: "1d" })

      return NextResponse.json({ token, user: data.facebookLogin.user })
    } else {
      return NextResponse.json({ error: "Facebook login failed" }, { status: 401 })
    }
  } catch (error) {
    logger.error("Facebook login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
