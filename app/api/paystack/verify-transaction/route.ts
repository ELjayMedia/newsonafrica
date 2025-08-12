import { NextResponse } from "next/server"
import type { NextRequest } from "next/request"
import { createAdminClient } from "@/lib/supabase"

export const runtime = "nodejs"

function calculateEndDate(interval: string | undefined) {
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

    // Store payment and related information in database
    if (data.status && data.data.status === "success") {
      try {
        const admin = createAdminClient()
        const metadata = data.data.metadata || {}
        const userId = metadata.user_id as string | undefined
        const type = (metadata.type as string) || "subscription"

        // Record payment
        await admin.from("payments").insert({
          user_id: userId || null,
          type,
          reference: data.data.reference,
          amount: data.data.amount,
          currency: data.data.currency,
          status: data.data.status,
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
            payment_id: data.data.reference,
            metadata: data.data,
          })
        } else if (type === "gift") {
          await admin.from("article_gifts").insert({
            user_id: userId || null,
            article_id: metadata.article_id,
            recipient_email: metadata.recipient_email,
            reference: data.data.reference,
            amount: data.data.amount,
            currency: data.data.currency,
            status: data.data.status,
          })
        }

        console.log("Payment verified and stored:", data.data.reference)
      } catch (dbError) {
        console.error("Error storing payment information:", dbError)
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
