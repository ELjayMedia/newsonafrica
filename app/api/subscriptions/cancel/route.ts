import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { paystackClient } from "@/lib/paystack-utils"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get subscription ID from request
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 })
    }

    // Get subscription from database
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Cancel subscription with payment provider
    if (subscription.provider === "paystack" && subscription.provider_subscription_id) {
      await paystackClient.disableSubscription(subscription.provider_subscription_id, {
        reason: "User requested cancellation",
      })
    }

    // Update subscription status in database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", subscriptionId)
      .eq("user_id", session.user.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
  }
}
