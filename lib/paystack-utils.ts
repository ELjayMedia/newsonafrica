import type { PaystackVerifyResponse } from "@/types/paystack"

/**
 * Verifies a Paystack transaction using the transaction reference
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  try {
    console.log("Verifying transaction with reference:", reference)

    const response = await fetch(`/api/paystack/verify-transaction?reference=${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("Verification response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Verification failed:", errorData)
      throw new Error(errorData.message || `Failed to verify transaction: ${response.status}`)
    }

    const data = await response.json()
    console.log("Verification successful:", data.status)
    return data
  } catch (error) {
    console.error("Error verifying transaction:", error)
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
 * This function is used to create a public URL that forwards to your local server
 * for testing Paystack webhooks in development
 */
export function startWebhookTunnel() {
  // Only run in development mode
  if (process.env.NODE_ENV !== "development") {
    return
  }

  console.log("Starting webhook tunnel for Paystack...")

  // In a real implementation, you might use a package like localtunnel or ngrok
  // to create a public URL that forwards to your local server
  //
  // Example with localtunnel (if it were installed):
  // const localtunnel = require('localtunnel');
  // const tunnel = localtunnel({ port: 3000, subdomain: 'newsonafrica-paystack' });
  // tunnel.then(tunnel => {
  //   console.log(`Webhook tunnel started at: ${tunnel.url}/api/webhooks/paystack`);
  // });

  // For now, we'll just log a message
  console.log("Webhook tunnel simulation: In production, use a real webhook URL")
}
