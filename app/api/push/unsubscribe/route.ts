import { type NextRequest, NextResponse } from "next/server"
import logger from '@/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()

    // Here you would typically remove the subscription from your database
    logger.debug("Push unsubscription received for endpoint:", endpoint)

    // In a real implementation, you would:
    // 1. Find the subscription by endpoint
    // 2. Remove it from your database
    // 3. Clean up any related data

    return NextResponse.json({ success: true, message: "Subscription removed" })
  } catch (error) {
    logger.error("Error removing push subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to remove subscription" }, { status: 500 })
  }
}
