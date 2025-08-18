import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Only return non-sensitive LinkedIn configuration for client
    const config = {
      // Return only what the client needs, not the actual API key
      hasLinkedInIntegration: !!env.LINKEDIN_API_KEY,
      authUrl: env.LINKEDIN_API_KEY
        ? `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${env.LINKEDIN_API_KEY}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=linkedin_auth`
        : null,
    }

    return NextResponse.json(config)
  } catch (error) {
    logger.error("LinkedIn config error:", error)
    return NextResponse.json({ error: "Failed to get LinkedIn configuration" }, { status: 500 })
  }
}
