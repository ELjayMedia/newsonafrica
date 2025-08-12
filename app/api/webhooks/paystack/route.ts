import { NextResponse } from "next/server"
import crypto from "crypto"
import { startWebhookTunnel } from "@/lib/paystack-utils"
import { createAdminClient } from "@/lib/supabase"

function calculateEndDate(interval?: string) {
  const end = new Date()
  switch (interval) {
    case "annually":
      end.setFullYear(end.getFullYear() + 1)
      break
    case "biannually":
      end.setMonth(end.getMonth() + 6)
      break
    default:
      end.setMonth(end.getMonth() + 1)
  }
  return end.toISOString()
}

// Start webhook tunnel in development
if (process.env.NODE_ENV === "development") {
  startWebhookTunnel()
}

export async function POST(request: Request) {
  try {
    // Get the signature from the headers
    const signature = request.headers.get("x-paystack-signature")

    if (!signature) {
      console.error("No Paystack signature provided")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Get the request body as text
    const body = await request.text()

    // Verify the signature
    const secretKey = process.env.PAYSTACK_SECRET_KEY || ""
    const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex")

    if (hash !== signature) {
      console.error("Invalid Paystack signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the body
    const event = JSON.parse(body)
    console.log(`Received Paystack webhook: ${event.event}`)

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data)
        break

      case "subscription.create":
        await handleSubscriptionCreated(event.data)
        break

      case "subscription.disable":
        await handleSubscriptionDisabled(event.data)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data)
        break

      case "invoice.update":
        await handleInvoiceUpdate(event.data)
        break

      case "transfer.success":
        await handleTransferSuccess(event.data)
        break

      case "transfer.failed":
        await handleTransferFailed(event.data)
        break

      default:
        console.log(`Unhandled Paystack event: ${event.event}`, event.data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

// Event handlers
async function handleChargeSuccess(data: any) {
  console.log("Processing successful charge:", data.reference)
  try {
    const admin = createAdminClient()
    const metadata = data.metadata || {}
    const userId = metadata.user_id as string | undefined
    const type = (metadata.type as string) || "subscription"

    await admin.from("payments").insert({
      user_id: userId || null,
      type,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency || "NGN",
      status: data.status,
      description: metadata.description || null,
    })

    if (type === "subscription" && userId) {
      await admin.from("subscriptions").insert({
        user_id: userId,
        plan: metadata.plan_id || metadata.plan_name || "plan",
        status: "active",
        start_date: new Date().toISOString(),
        end_date: calculateEndDate(metadata.interval),
        payment_provider: "paystack",
        payment_id: data.reference,
        metadata: data,
      })
    } else if (type === "gift") {
      await admin.from("article_gifts").insert({
        user_id: userId || null,
        article_id: metadata.article_id,
        recipient_email: metadata.recipient_email,
        reference: data.reference,
        amount: data.amount,
        currency: data.currency || "NGN",
        status: data.status,
      })
    }
  } catch (error) {
    console.error("Error processing charge.success webhook:", error)
  }
}

async function handleSubscriptionCreated(data: any) {
  console.log("Processing subscription creation:", data.subscription_code)
  try {
    const admin = createAdminClient()
    const metadata = data.customer?.metadata || {}
    const userId = metadata.user_id as string | undefined

    await admin.from("subscriptions").insert({
      user_id: userId || null,
      plan: data.plan?.plan_code || data.plan?.name || "plan",
      status: data.status || "active",
      start_date: new Date(data.createdAt).toISOString(),
      end_date: data.next_payment_date ? new Date(data.next_payment_date).toISOString() : null,
      payment_provider: "paystack",
      payment_id: data.subscription_code,
      metadata: data,
    })
  } catch (error) {
    console.error("Error storing subscription from webhook:", error)
  }
}

async function handleSubscriptionDisabled(data: any) {
  console.log("Processing subscription cancellation:", data.subscription_code)
  try {
    const admin = createAdminClient()
    await admin
      .from("subscriptions")
      .update({ status: "cancelled", end_date: new Date().toISOString() })
      .eq("payment_id", data.subscription_code)
  } catch (error) {
    console.error("Error cancelling subscription:", error)
  }
}

async function handlePaymentFailed(data: any) {
  console.log("Processing failed payment:", data.reference)
  try {
    const admin = createAdminClient()
    const metadata = data.metadata || {}
    const userId = metadata.user_id as string | undefined
    const type = (metadata.type as string) || "subscription"

    await admin.from("payments").insert({
      user_id: userId || null,
      type,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency || "NGN",
      status: "failed",
      description: metadata.description || null,
    })
  } catch (error) {
    console.error("Error storing failed payment:", error)
  }
}

async function handleInvoiceUpdate(data: any) {
  console.log("Processing invoice update:", data.invoice_code)
  try {
    const admin = createAdminClient()
    if (data.status === "success" && data.subscription?.subscription_code) {
      await admin
        .from("subscriptions")
        .update({ end_date: data.next_payment_date ? new Date(data.next_payment_date).toISOString() : null })
        .eq("payment_id", data.subscription.subscription_code)
    }
  } catch (error) {
    console.error("Error processing invoice update:", error)
  }
}

async function handleTransferSuccess(data: any) {
  console.log("Processing successful transfer:", data.reference)

  // TODO: Implement your business logic
}

async function handleTransferFailed(data: any) {
  console.log("Processing failed transfer:", data.reference)

  // TODO: Implement your business logic
}
