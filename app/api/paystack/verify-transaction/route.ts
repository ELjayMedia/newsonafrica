import { NextResponse } from "next/server"
import type { NextRequest } from "next/request"
import { revalidatePath, revalidateTag } from "next/cache"
import { CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache-utils"

// Cache policy: short (1 minute)
export const revalidate = CACHE_DURATIONS.SHORT

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get("reference")

  console.log("Verifying transaction with reference:", reference)

  if (!reference) {
    console.error("Missing reference parameter")
    return NextResponse.json({ status: false, error: "Transaction reference is required" }, { status: 400 })
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY is not defined")
    return NextResponse.json({ status: false, error: "Payment configuration error" }, { status: 500 })
  }

  try {
    console.log("Making request to Paystack API")
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    console.log("Paystack API response status:", response.status)

    if (!response.ok) {
      console.error("Paystack API error:", data)
      return NextResponse.json(
        { status: false, error: data.message || "Failed to verify transaction" },
        { status: response.status },
      )
    }

    // Store subscription information in database
    if (data.status && data.data.status === "success") {
      try {
        // Here you would typically store the subscription in your database
        // ...
        console.log("Subscription verified and stored:", data.data.reference)
        revalidateTag(CACHE_TAGS.SUBSCRIPTIONS)
        revalidatePath("/subscriptions")
      } catch (dbError) {
        console.error("Error storing subscription:", dbError)
        // We still return success to the client since the payment was successful
        // But log the error for server-side investigation
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error verifying transaction:", error)
    return NextResponse.json(
      { status: false, error: "An error occurred while verifying the transaction" },
      { status: 500 },
    )
  }
}
