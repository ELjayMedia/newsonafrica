import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  buildInvoiceMetadataUpdate,
  buildPaymentFailureUpdate,
  buildSubscriptionCancellationUpdate,
  buildSubscriptionUpsert,
} from "../_shared/paystack.ts"

type SupabaseClient = ReturnType<typeof createClient>

async function verifySignature(req: Request, secret: string) {
  const text = await req.text()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(text))
  const hash = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("")
  return { payload: text, hash }
}

function extractMetadataUserId(data: Record<string, any>) {
  const metadata = data?.metadata
  if (metadata && typeof metadata === "object") {
    if (typeof metadata.user_id === "string" && metadata.user_id.trim().length > 0) {
      return metadata.user_id
    }
    if (typeof metadata.userId === "string" && metadata.userId.trim().length > 0) {
      return metadata.userId
    }
  }
  return null
}

function extractCustomerEmail(data: Record<string, any>) {
  const customer = data?.customer
  if (customer && typeof customer === "object") {
    if (typeof customer.email === "string" && customer.email.trim().length > 0) {
      return customer.email.trim()
    }
    if (typeof customer.customer_email === "string" && customer.customer_email.trim().length > 0) {
      return customer.customer_email.trim()
    }
  }
  if (typeof data?.customer_email === "string" && data.customer_email.trim().length > 0) {
    return data.customer_email.trim()
  }
  return null
}

async function resolveUserId(client: SupabaseClient, data: Record<string, any>) {
  const metadataUserId = extractMetadataUserId(data)
  if (metadataUserId) return metadataUserId

  const email = extractCustomerEmail(data)
  if (!email) return null

  const { data: profile, error } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("Failed to resolve profile for email", email, error)
    return null
  }

  return profile?.id ?? null
}

async function handleSubscriptionCreate(client: SupabaseClient, data: Record<string, any>) {
  const userId = await resolveUserId(client, data)
  if (!userId) {
    console.warn("Unable to resolve user for subscription create", data?.subscription_code)
    return
  }

  const record = buildSubscriptionUpsert(data, userId)
  const { error } = await client.from("subscriptions").upsert(record, { onConflict: "id" })
  if (error) {
    console.error("Failed to upsert subscription", error)
  }
}

async function handleSubscriptionDisable(client: SupabaseClient, data: Record<string, any>) {
  const update = buildSubscriptionCancellationUpdate()
  const { error } = await client.from("subscriptions").update(update).eq("id", data?.subscription_code ?? data?.subscription)
  if (error) {
    console.error("Failed to cancel subscription", error)
  }
}

async function handleInvoiceUpdate(client: SupabaseClient, data: Record<string, any>) {
  const update = buildInvoiceMetadataUpdate(data)
  const invoiceCode = data?.invoice_code || data?.payment_id
  if (!invoiceCode) {
    console.warn("Invoice update missing invoice code")
    return
  }
  const { error } = await client.from("subscriptions").update(update).eq("payment_id", invoiceCode)
  if (error) {
    console.error("Failed to update invoice metadata", error)
  }
}

async function handleInvoiceFailed(client: SupabaseClient, data: Record<string, any>) {
  const update = buildPaymentFailureUpdate(data)
  const invoiceCode = data?.invoice_code || data?.payment_id
  if (!invoiceCode) {
    console.warn("Invoice payment failed without invoice code")
    return
  }
  const { error } = await client.from("subscriptions").update(update).eq("payment_id", invoiceCode)
  if (error) {
    console.error("Failed to update failed invoice", error)
  }
}

async function processEvent(client: SupabaseClient, event: Record<string, any>) {
  switch (event?.event) {
    case "subscription.create":
      await handleSubscriptionCreate(client, event.data || {})
      break
    case "subscription.disable":
      await handleSubscriptionDisable(client, event.data || {})
      break
    case "invoice.update":
      await handleInvoiceUpdate(client, event.data || {})
      break
    case "invoice.payment_failed":
      await handleInvoiceFailed(client, event.data || {})
      break
    default:
      break
  }
}

export async function handlePaystackWebhook(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const secret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET")
  if (!secret) {
    console.error("PAYSTACK_WEBHOOK_SECRET is not configured")
    return new Response("Server misconfigured", { status: 500 })
  }

  const sigHeader = request.headers.get("x-paystack-signature") || ""
  const { payload, hash } = await verifySignature(request.clone(), secret)
  if (hash !== sigHeader) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const event = JSON.parse(payload)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  await processEvent(supabase, event)

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  })
}

serve(handlePaystackWebhook)
