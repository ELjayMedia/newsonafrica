import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { NextResponse } from "next/server"
import crypto from "crypto"
import { startWebhookTunnel } from "@/lib/paystack-utils"
import { createAdminClient } from "@/lib/supabase"

// Start webhook tunnel in development
if (env.NODE_ENV === "development") {
  startWebhookTunnel()
}

// Common Paystack customer object
interface PaystackCustomer {
  email: string
  [key: string]: any
}

export interface ChargeSuccessPayload {
  reference: string
  amount: number
  status: string
  paid_at: string
  customer: PaystackCustomer
  plan?: { name?: string; code?: string }
  [key: string]: any
}

export interface SubscriptionCreatedPayload {
  subscription_code: string
  status: string
  customer: PaystackCustomer
  plan: { name: string; plan_code?: string }
  createdAt: string
  next_payment_date: string
  [key: string]: any
}

export interface SubscriptionDisabledPayload {
  subscription_code: string
  status: string
  customer: PaystackCustomer
  disabled_on: string
  [key: string]: any
}

export interface InvoicePaymentFailedPayload {
  invoice_code: string
  amount: number
  customer: PaystackCustomer
  subscription: { code: string }
  status: string
  [key: string]: any
}

export interface InvoiceUpdatePayload {
  invoice_code: string
  amount: number
  customer: PaystackCustomer
  subscription: { code: string }
  status: string
  [key: string]: any
}

export interface TransferSuccessPayload {
  reference: string
  amount: number
  status: string
  recipient: string
  [key: string]: any
}

export interface TransferFailedPayload extends TransferSuccessPayload {
  reason: string
}

export async function POST(request: Request) {
  try {
    // Get the signature from the headers
    const signature = request.headers.get("x-paystack-signature")

    if (!signature) {
      logger.error("No Paystack signature provided")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    // Get the request body as text
    const body = await request.text()

    // Verify the signature
    const secretKey = env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      logger.error("Paystack secret key not configured")
      return NextResponse.json(
        { error: "Server misconfigured: missing Paystack secret key" },
        { status: 500 }
      )
    }
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(body)
      .digest("hex")

    if (hash !== signature) {
      logger.error("Invalid Paystack signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the body
    const event = JSON.parse(body)
    logger.info(`Received Paystack webhook: ${event.event}`)

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
        logger.info(`Unhandled Paystack event: ${event.event}`, event.data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

// Event handlers
export async function handleChargeSuccess(
  data: ChargeSuccessPayload,
  db = createAdminClient(),
) {
  logger.info("Processing successful charge:", data.reference)
  try {
    const { data: user, error } = await db
      .from("profiles")
      .select("id")
      .eq("email", data.customer.email)
      .single()

    if (error || !user) {
      throw error || new Error("User not found")
    }

    await db.from("subscriptions").insert({
      user_id: user.id,
      plan: data.plan?.name || "unknown",
      status: data.status,
      start_date: data.paid_at,
      payment_provider: "paystack",
      payment_id: data.reference,
      metadata: data,
    })

    await db.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Payment Successful",
      message: `Your payment of ₦${(data.amount / 100).toFixed(2)} was successful`,
      link: "/subscriptions",
      is_read: false,
      metadata: { reference: data.reference },
    })
  } catch (err) {
    logger.error("Error handling charge.success:", err)
  }
}

export async function handleSubscriptionCreated(
  data: SubscriptionCreatedPayload,
  db = createAdminClient(),
) {
  logger.info("Processing subscription creation:", data.subscription_code)
  try {
    const { data: user, error } = await db
      .from("profiles")
      .select("id")
      .eq("email", data.customer.email)
      .single()

    if (error || !user) {
      throw error || new Error("User not found")
    }

    await db.from("subscriptions").insert({
      user_id: user.id,
      plan: data.plan.name,
      status: data.status,
      start_date: data.createdAt,
      payment_provider: "paystack",
      payment_id: data.subscription_code,
      metadata: data,
    })

    await db.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Subscription Created",
      message: `Your subscription to ${data.plan.name} is active`,
      link: "/subscriptions",
      is_read: false,
      metadata: { subscription_code: data.subscription_code },
    })
  } catch (err) {
    logger.error("Error handling subscription.create:", err)
  }
}

export async function handleSubscriptionDisabled(
  data: SubscriptionDisabledPayload,
  db = createAdminClient(),
) {
  logger.info("Processing subscription cancellation:", data.subscription_code)
  try {
    const { data: user, error } = await db
      .from("profiles")
      .select("id")
      .eq("email", data.customer.email)
      .single()

    if (error || !user) {
      throw error || new Error("User not found")
    }

    await db
      .from("subscriptions")
      .update({
        status: "cancelled",
        end_date: new Date().toISOString(),
        metadata: data,
      })
      .eq("payment_id", data.subscription_code)
      .eq("user_id", user.id)

    await db.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Subscription Cancelled",
      message: "Your subscription has been cancelled",
      link: "/subscriptions",
      is_read: false,
      metadata: { subscription_code: data.subscription_code },
    })
  } catch (err) {
    logger.error("Error handling subscription.disable:", err)
  }
}

export async function handlePaymentFailed(
  data: InvoicePaymentFailedPayload,
  db = createAdminClient(),
) {
  logger.info("Processing failed payment:", data.invoice_code)
  try {
    const { data: user, error } = await db
      .from("profiles")
      .select("id")
      .eq("email", data.customer.email)
      .single()

    if (error || !user) {
      throw error || new Error("User not found")
    }

    await db
      .from("subscriptions")
      .update({ status: "past_due", metadata: data })
      .eq("payment_id", data.subscription.code)
      .eq("user_id", user.id)

    await db.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Payment Failed",
      message: `Payment for invoice ${data.invoice_code} failed`,
      link: "/subscriptions",
      is_read: false,
      metadata: { invoice_code: data.invoice_code },
    })
  } catch (err) {
    logger.error("Error handling invoice.payment_failed:", err)
  }
}

export async function handleInvoiceUpdate(
  data: InvoiceUpdatePayload,
  db = createAdminClient(),
) {
  logger.info("Processing invoice update:", data.invoice_code)
  try {
    const { data: user, error } = await db
      .from("profiles")
      .select("id")
      .eq("email", data.customer.email)
      .single()

    if (error || !user) {
      throw error || new Error("User not found")
    }

    await db
      .from("subscriptions")
      .update({ metadata: data })
      .eq("payment_id", data.subscription.code)
      .eq("user_id", user.id)

    await db.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Invoice Updated",
      message: `Your invoice ${data.invoice_code} was updated`,
      link: "/subscriptions",
      is_read: false,
      metadata: { invoice_code: data.invoice_code },
    })
  } catch (err) {
    logger.error("Error handling invoice.update:", err)
  }
}

export async function handleTransferSuccess(
  data: TransferSuccessPayload,
  db = createAdminClient(),
) {
  logger.info("Processing successful transfer:", data.reference)
  try {
    const { data: admins, error } = await db
      .from("profiles")
      .select("id")
      .eq("is_admin", true)

    if (error || !admins) {
      throw error || new Error("No admins found")
    }

    await Promise.all(
      admins.map((admin: any) =>
        db.from("notifications").insert({
          user_id: admin.id,
          type: "system",
          title: "Transfer Successful",
          message: `Transfer ${data.reference} succeeded`,
          link: "/admin/transfers",
          is_read: false,
          metadata: { reference: data.reference },
        }),
      ),
    )
  } catch (err) {
    logger.error("Error handling transfer.success:", err)
  }
}

export async function handleTransferFailed(
  data: TransferFailedPayload,
  db = createAdminClient(),
) {
  logger.info("Processing failed transfer:", data.reference)
  try {
    const { data: admins, error } = await db
      .from("profiles")
      .select("id")
      .eq("is_admin", true)

    if (error || !admins) {
      throw error || new Error("No admins found")
    }

    await Promise.all(
      admins.map((admin: any) =>
        db.from("notifications").insert({
          user_id: admin.id,
          type: "system",
          title: "Transfer Failed",
          message: `Transfer ${data.reference} failed: ${data.reason}`,
          link: "/admin/transfers",
          is_read: false,
          metadata: { reference: data.reference },
        }),
      ),
    )
  } catch (err) {
    logger.error("Error handling transfer.failed:", err)
  }
}
