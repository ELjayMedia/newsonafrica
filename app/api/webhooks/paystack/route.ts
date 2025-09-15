import { NextResponse } from "next/server"
import crypto from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "../../../../lib/supabase"
import { startWebhookTunnel } from "../../../../lib/paystack-utils"
import { revalidatePath } from "next/cache"
import { CACHE_DURATIONS, CACHE_TAGS, revalidateByTag } from "@/lib/cache-utils"

// Cache policy: none (webhook endpoint)
export const revalidate = CACHE_DURATIONS.NONE

interface PaystackCustomer {
  email: string
  [key: string]: any
}

interface ChargeSuccessData {
  reference: string
  amount: number
  status: string
  customer: PaystackCustomer
}

interface SubscriptionCreatedData {
  subscription_code: string
  customer: PaystackCustomer
  plan: { name: string }
  status: string
  createdAt: string
  next_payment_date: string
}

interface SubscriptionDisabledData {
  subscription_code: string
}

interface PaymentFailedData {
  reference: string
  customer: PaystackCustomer
}

interface InvoiceUpdateData {
  invoice_code: string
  customer: PaystackCustomer
  status: string
}

interface TransferData {
  reference: string
  amount: number
  customer?: PaystackCustomer
  [key: string]: any
}

async function getUserIdByEmail(client: SupabaseClient, email: string) {
  const { data, error } = await (client as any)
    .from("users", { schema: "auth" })
    .select("id")
    .eq("email", email)
    .single()
  if (error || !data) {
    throw new Error("User not found")
  }
  return data.id as string
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
export async function handleChargeSuccess(
  data: ChargeSuccessData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing successful charge:", data.reference)
  const userId = await getUserIdByEmail(client, data.customer.email)
  const { error: txnError } = await (client as any)
    .from("transactions")
    .insert({
      id: data.reference,
      user_id: userId,
      amount: data.amount / 100,
      status: data.status,
      metadata: data,
    })
  if (txnError) throw new Error("Failed to save transaction")

  revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)
  try {
    revalidatePath("/subscriptions")
  } catch (error) {
    console.error("Error revalidating path /subscriptions:", error)
  }
}

export async function handleSubscriptionCreated(
  data: SubscriptionCreatedData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing subscription creation:", data.subscription_code)
  const userId = await getUserIdByEmail(client, data.customer.email)
  const { error } = await client.from("subscriptions").insert({
    id: data.subscription_code,
    user_id: userId,
    plan: data.plan.name,
    status: data.status,
    start_date: new Date(data.createdAt).toISOString(),
    end_date: null,
    renewal_date: new Date(data.next_payment_date).toISOString(),
    payment_provider: "paystack",
    payment_id: data.subscription_code,
    metadata: data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error("Failed to create subscription")

  revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)
  try {
    revalidatePath("/subscriptions")
  } catch (error) {
    console.error("Error revalidating path /subscriptions:", error)
  }
}

export async function handleSubscriptionDisabled(
  data: SubscriptionDisabledData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing subscription cancellation:", data.subscription_code)
  const { data: sub, error: fetchError } = await client
    .from("subscriptions")
    .select("user_id")
    .eq("id", data.subscription_code)
    .single()
  if (fetchError || !sub) throw new Error("Subscription not found")
  const { error } = await client
    .from("subscriptions")
    .update({
      status: "cancelled",
      end_date: new Date().toISOString(),
      renewal_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.subscription_code)
  if (error) throw new Error("Failed to cancel subscription")

  revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)
  try {
    revalidatePath("/subscriptions")
  } catch (error) {
    console.error("Error revalidating path /subscriptions:", error)
  }
}

export async function handlePaymentFailed(
  data: PaymentFailedData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing failed payment:", data.reference)
  const userId = await getUserIdByEmail(client, data.customer.email)
  const { error } = await (client as any)
    .from("transactions")
    .update({ status: "failed" })
    .eq("id", data.reference)
  if (error) throw new Error("Failed to update transaction")
}

export async function handleInvoiceUpdate(
  data: InvoiceUpdateData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing invoice update:", data.invoice_code)
  const userId = await getUserIdByEmail(client, data.customer.email)
  const { error } = await client
    .from("subscriptions")
    .update({ metadata: data, updated_at: new Date().toISOString() })
    .eq("payment_id", data.invoice_code)
  if (error) throw new Error("Failed to update invoice")

  revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)
  try {
    revalidatePath("/subscriptions")
  } catch (error) {
    console.error("Error revalidating path /subscriptions:", error)
  }
}

export async function handleTransferSuccess(
  data: TransferData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing successful transfer:", data.reference)
  const { error } = await (client as any).from("transfers").insert({
    id: data.reference,
    amount: data.amount / 100,
    status: "success",
    metadata: data,
  })
  if (error) throw new Error("Failed to save transfer")
}

export async function handleTransferFailed(
  data: TransferData,
  client: SupabaseClient = createAdminClient(),
) {
  console.log("Processing failed transfer:", data.reference)
  const { error } = await (client as any)
    .from("transfers")
    .update({ status: "failed", metadata: data })
    .eq("id", data.reference)
  if (error) throw new Error("Failed to update transfer")
}
