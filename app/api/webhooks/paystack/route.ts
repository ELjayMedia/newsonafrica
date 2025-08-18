import { env } from '@/lib/config/env';
import { NextResponse } from "next/server"
import crypto from "crypto"
import { startWebhookTunnel } from "@/lib/paystack-utils"

// Start webhook tunnel in development
if (env.NODE_ENV === "development") {
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
    const secretKey = env.PAYSTACK_SECRET_KEY || ""
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

  // TODO: Implement your business logic
  // 1. Verify the transaction (optional, as Paystack already verified it)
  // 2. Update your database with payment information
  // 3. Provision access to the user

  // Example:
  // await db.transaction.create({
  //   data: {
  //     reference: data.reference,
  //     amount: data.amount / 100, // Convert from kobo to naira
  //     email: data.customer.email,
  //     status: 'success',
  //     metadata: data,
  //   },
  // })
}

async function handleSubscriptionCreated(data: any) {
  console.log("Processing subscription creation:", data.subscription_code)

  // TODO: Implement your business logic
  // 1. Update your database with subscription information
  // 2. Provision access to the user

  // Example:
  // await db.subscription.create({
  //   data: {
  //     code: data.subscription_code,
  //     customer: data.customer.email,
  //     plan: data.plan.name,
  //     status: data.status,
  //     start_date: new Date(data.createdAt),
  //     next_payment_date: new Date(data.next_payment_date),
  //   },
  // })
}

async function handleSubscriptionDisabled(data: any) {
  console.log("Processing subscription cancellation:", data.subscription_code)

  // TODO: Implement your business logic
  // 1. Update your database with subscription status
  // 2. Revoke access at the appropriate time

  // Example:
  // await db.subscription.update({
  //   where: { code: data.subscription_code },
  //   data: { status: 'cancelled', cancelled_at: new Date() },
  // })
}

async function handlePaymentFailed(data: any) {
  console.log("Processing failed payment:", data.reference)

  // TODO: Implement your business logic
  // 1. Update your database with payment status
  // 2. Notify the user
  // 3. Attempt recovery if appropriate

  // Example:
  // await db.transaction.update({
  //   where: { reference: data.reference },
  //   data: { status: 'failed' },
  // })
  // await sendEmail({
  //   to: data.customer.email,
  //   subject: 'Payment Failed',
  //   text: 'Your payment failed. Please update your payment method.',
  // })
}

async function handleInvoiceUpdate(data: any) {
  console.log("Processing invoice update:", data.invoice_code)

  // TODO: Implement your business logic
}

async function handleTransferSuccess(data: any) {
  console.log("Processing successful transfer:", data.reference)

  // TODO: Implement your business logic
}

async function handleTransferFailed(data: any) {
  console.log("Processing failed transfer:", data.reference)

  // TODO: Implement your business logic
}
