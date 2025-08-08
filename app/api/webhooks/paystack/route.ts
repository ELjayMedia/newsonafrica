import { NextResponse } from "next/server"
import { startWebhookTunnel, verifyWebhookSignature } from "@/lib/paystack-utils"
import { createAdminClient } from "@/lib/supabase"
import logger from "@/utils/logger"

if (process.env.NODE_ENV === "development") {
  startWebhookTunnel()
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-paystack-signature") || ""
    const body = await request.text()

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event = JSON.parse(body)
    const supabase = createAdminClient()

    await supabase
      .from("webhook_events")
      .insert({ event_type: event.event, payload: event })

    switch (event.event) {
      case "subscription.create":
        await handleSubscriptionCreated(event.data, supabase)
        break
      case "charge.success":
        await handleChargeSuccess(event.data, supabase)
        break
      case "subscription.disable":
        await handleSubscriptionDisabled(event.data, supabase)
        break
      default:
        logger(`Unhandled Paystack event: ${event.event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleSubscriptionCreated(data: any, supabase: any) {
  const email = data.customer?.email
  const planCode = data.plan?.plan_code
  if (!email || !planCode) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single()
  if (!profile) return

  const { data: plan } = await supabase
    .from("plans")
    .select("id, name")
    .eq("paystack_plan_id", planCode)
    .single()
  if (!plan) return

  await supabase.from("subscriptions").upsert(
    {
      user_id: profile.id,
      plan_id: plan.id,
      plan_name: plan.name,
      provider: "paystack",
      provider_subscription_id: data.subscription_code,
      provider_email_token: data.email_token,
      status: data.status,
      current_period_end: data.next_payment_date,
    },
    { onConflict: "provider_subscription_id" },
  )
}

async function handleChargeSuccess(data: any, supabase: any) {
  const subCode = data.subscription_code || data.subscription?.subscription_code
  if (!subCode) return

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subCode)
    .single()
  if (!subscription) return

  await supabase.from("payments").insert({
    subscription_id: subscription.id,
    paystack_charge_id: String(data.id || data.reference),
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    paid_at: data.paid_at || data.paidAt,
  })

  await supabase
    .from("subscriptions")
    .update({ status: "active" })
    .eq("id", subscription.id)
}

async function handleSubscriptionDisabled(data: any, supabase: any) {
  const subCode = data.subscription_code
  if (!subCode) return

  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("provider_subscription_id", subCode)
}
