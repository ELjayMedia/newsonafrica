import logger from "@/utils/logger";
import env from "@/lib/config/env";
import type { PaystackVerifyResponse } from "@/config/paystack"
import localtunnel from "localtunnel";

export let webhookTunnelUrl: string | null = null;

/**
 * Verifies a Paystack transaction using the transaction reference
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  try {
    logger.info("Verifying transaction with reference:", reference)

    const response = await fetch(`/api/paystack/verify-transaction?reference=${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    logger.info("Verification response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error("Verification failed:", errorData)
      throw new Error(errorData.message || `Failed to verify transaction: ${response.status}`)
    }

    const data = await response.json()
    logger.info("Verification successful:", data.status)
    return data
  } catch (error) {
    logger.error("Error verifying transaction:", error)
    // Return a default response to prevent the UI from getting stuck
    return {
      status: false,
      message: error instanceof Error ? error.message : "Unknown error during verification",
      data: null as any,
    }
  }
}

/**
 * Generates a unique transaction reference for Paystack
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now()
  const randomNum = Math.floor(Math.random() * 1000000)
  return `NOA_${timestamp}_${randomNum}`
}

/**
 * Formats currency amount for display
 */
export function formatCurrency(amount: number, currency = "ZAR"): string {
  // Convert from cents to actual currency
  const actualAmount = amount / 100

  // Format based on currency
  switch (currency) {
    case "ZAR":
      return `R${actualAmount.toFixed(2)}`
    case "USD":
      return `${actualAmount.toFixed(2)}`
    case "NGN":
      return `₦${actualAmount.toFixed(2)}`
    default:
      return `${actualAmount.toFixed(2)} ${currency}`
  }
}

/**
 * Calculates the monthly equivalent price for display purposes
 */
export function calculateMonthlyPrice(amount: number, interval: string): number {
  switch (interval) {
    case "monthly":
      return amount
    case "biannually":
      return amount / 6
    case "annually":
      return amount / 12
    default:
      return amount
  }
}

/**
 * Formats a date in the future based on the subscription interval
 */
export function formatNextBillingDate(interval: string): string {
  const date = new Date()

  switch (interval) {
    case "monthly":
      date.setMonth(date.getMonth() + 1)
      break
    case "biannually":
      date.setMonth(date.getMonth() + 6)
      break
    case "annually":
      date.setFullYear(date.getFullYear() + 1)
      break
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Starts a webhook tunnel for local development
 * This creates a public URL that forwards to your local server
 * for testing Paystack webhooks in development
 */
export async function startWebhookTunnel(retries = 3): Promise<string | null> {
  if (env.NODE_ENV !== "development") {
    return null
  }

  const port = Number(process.env.PORT) || 3000

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Starting webhook tunnel for Paystack (attempt ${attempt})...`)
      const tunnel = await localtunnel({ port })
      webhookTunnelUrl = `${tunnel.url}/api/webhooks/paystack`
      logger.info(`Webhook tunnel started at: ${webhookTunnelUrl}`)
      tunnel.on("close", () => logger.info("Webhook tunnel closed"))
      return webhookTunnelUrl
    } catch (error) {
      logger.error(`Failed to start webhook tunnel (attempt ${attempt}):`, error)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  logger.error("Unable to start webhook tunnel after multiple attempts")
  return null
}

// Add the missing export for paystackClient
/**
 * A simple client for interacting with Paystack API
 * This is a placeholder implementation that should be replaced with actual Paystack SDK usage
 */
export const paystackClient = {
  verifyTransaction: verifyPaystackTransaction,
  generateReference: generateTransactionReference,
  formatAmount: formatCurrency,
}
