import { NextResponse } from "next/server"
import { GraphQLClient } from "graphql-request"
import jwt from "jsonwebtoken"

const WORDPRESS_API_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
  "https://newsonafrica.com/sz/graphql"


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

async function verifyFacebookToken(
  accessToken: string,
  userID: string,
  appId: string,
  appSecret: string,
) {
  const response = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`,
  )
  const data = await response.json()

  if (data.data.is_valid && data.data.user_id === userID) {
    return true
  }
  return false
}

export async function POST(request: Request) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET
    const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET

    if (!JWT_SECRET || !FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      console.error("Missing required environment variables for Facebook auth")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const client = new GraphQLClient(WORDPRESS_API_URL)

    const { accessToken, userID } = await request.json()

    const isValidToken = await verifyFacebookToken(
      accessToken,
      userID,
      FACEBOOK_APP_ID,
      FACEBOOK_APP_SECRET,
    )
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
    console.error("Facebook login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
