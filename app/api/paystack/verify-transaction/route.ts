import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { createAdminClient } from "@/lib/supabase"

export const runtime = "nodejs"

// Cache policy: short (1 minute)
export const revalidate = 60

export async function GET(request: NextRequest) {
  logRequest(request)
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get("reference")

  console.log("Verifying transaction with reference:", reference)

  if (!reference) {
    console.error("Missing reference parameter")
    return jsonWithCors(request, { status: false, error: "Transaction reference is required" }, { status: 400 })
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY is not defined")
    return jsonWithCors(request, { status: false, error: "Payment configuration error" }, { status: 500 })
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
      return jsonWithCors(
        request,
        { status: false, error: data.message || "Failed to verify transaction" },
        { status: response.status },
      )
    }

    // Store subscription information in database
    if (data.status && data.data.status === "success") {
      try {
        const supabase = createAdminClient()
        const customer = data.data.customer || {}
        const metadata = data.data.metadata || {}
        let userId: string | null = metadata.user_id || null

        if (!userId && customer.email) {
          const { data: profileMatch } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", customer.email)
            .maybeSingle()

          if (profileMatch?.id) {
            userId = profileMatch.id
          }
        }

        if (userId) {
          const startDate = data.data.paid_at ? new Date(data.data.paid_at).toISOString() : new Date().toISOString()
          const renewalDate = data.data.next_payment_date ? new Date(data.data.next_payment_date).toISOString() : null
          const planName = data.data.plan?.name || data.data.plan?.plan_code || data.data.plan || "paystack"

          await supabase.from("subscriptions").upsert(
            {
              id: data.data.reference,
              user_id: userId,
              plan: planName,
              status: data.data.status || "success",
              start_date: startDate,
              end_date: null,
              renewal_date: renewalDate,
              payment_provider: "paystack",
              payment_id: data.data.reference,
              metadata: data.data,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          )

          revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)
          revalidatePath("/subscriptions")
        } else {
          console.warn("Unable to map Paystack transaction to a Supabase user", {
            reference: data.data.reference,
            email: customer.email,
          })
        }
      } catch (dbError) {
        console.error("Error storing subscription:", dbError)
        // We still return success to the client since the payment was successful
        // But log the error for server-side investigation
      }
    }

    return jsonWithCors(request, data)
  } catch (error) {
    console.error("Error verifying transaction:", error)
    return jsonWithCors(
      request,
      { status: false, error: "An error occurred while verifying the transaction" },
      { status: 500 },
    )
  }
}
