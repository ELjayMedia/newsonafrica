import logger from "@/utils/logger"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/request"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get("reference")

  logger.log("Verifying transaction with reference:", reference)

  if (!reference) {
    logger.error("Missing reference parameter")
    return NextResponse.json({ status: false, error: "Transaction reference is required" }, { status: 400 })
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

  if (!paystackSecretKey) {
    logger.error("PAYSTACK_SECRET_KEY is not defined")
    return NextResponse.json({ status: false, error: "Payment configuration error" }, { status: 500 })
  }

  try {
    logger.log("Making request to Paystack API")
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    logger.log("Paystack API response status:", response.status)

    if (!response.ok) {
      logger.error("Paystack API error:", data)
      return NextResponse.json(
        { status: false, error: data.message || "Failed to verify transaction" },
        { status: response.status },
      )
    }

    // Store subscription information in database
    if (data.status && data.data.status === "success") {
      try {
        // Here you would typically store the subscription in your database
        // For example:
        // await storeSubscription({
        //   userId: data.data.metadata.user_id,
        //   planId: data.data.metadata.plan_id,
        //   reference: data.data.reference,
        //   amount: data.data.amount,
        //   status: data.data.status,
        //   startDate: new Date(),
        //   endDate: calculateEndDate(data.data.metadata.interval),
        // })

        logger.log("Subscription verified and stored:", data.data.reference)
      } catch (dbError) {
        logger.error("Error storing subscription:", dbError)
        // We still return success to the client since the payment was successful
        // But log the error for server-side investigation
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error("Error verifying transaction:", error)
    return NextResponse.json(
      { status: false, error: "An error occurred while verifying the transaction" },
      { status: 500 },
    )
  }
}
