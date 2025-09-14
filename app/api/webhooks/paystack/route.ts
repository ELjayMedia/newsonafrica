import { NextResponse } from "next/server"
import crypto from "crypto"
import { startWebhookTunnel } from "../../../../lib/paystack-utils"
import {
  handleChargeSuccess,
  handleSubscriptionCreated,
  handleSubscriptionDisabled,
  handlePaymentFailed,
  handleInvoiceUpdate,
  handleTransferSuccess,
  handleTransferFailed,
} from "./handlers"

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
