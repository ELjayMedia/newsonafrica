import type { NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSupabaseRouteClient } from "@/lib/supabase/route"
import type { Database } from "@/types/supabase"
import { buildSubscriptionUpsert } from "@/supabase/functions/_shared/paystack"

type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]

export const runtime = "nodejs"

export const revalidate = 0

export async function GET(request: NextRequest) {
  logRequest(request)
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get("reference")

  if (!reference) {
    return jsonWithCors(request, { status: false, error: "Transaction reference is required" }, { status: 400 })
  }

  // Require an authenticated session — only the paying user should be able to
  // record their own subscription.
  const routeClient = createSupabaseRouteClient(request)
  if (!routeClient) {
    return jsonWithCors(request, { status: false, error: "Service unavailable" }, { status: 503 })
  }

  const {
    data: { session },
  } = await routeClient.supabase.auth.getSession()

  if (!session?.user) {
    return jsonWithCors(request, { status: false, error: "Unauthorized" }, { status: 401 })
  }

  const authenticatedUserId = session.user.id
  const authenticatedEmail = session.user.email?.toLowerCase()

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY is not defined")
    return jsonWithCors(request, { status: false, error: "Payment configuration error" }, { status: 500 })
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Paystack API error:", data)
      return jsonWithCors(
        request,
        { status: false, error: data.message || "Failed to verify transaction" },
        { status: response.status },
      )
    }

    if (data.status && data.data.status === "success") {
      try {
        const customer = data.data.customer || {}
        const metadata = data.data.metadata || {}

        // Bind the subscription to the authenticated user.  If the payment
        // metadata already carries a user_id, confirm it matches the session
        // to prevent one user from claiming another's payment.
        const metadataUserId: string | null = metadata.user_id || null
        const customerEmail: string | null = customer.email?.toLowerCase() ?? null

        const ownershipByUserId = !metadataUserId || metadataUserId === authenticatedUserId
        const ownershipByEmail = !customerEmail || customerEmail === authenticatedEmail

        if (!ownershipByUserId && !ownershipByEmail) {
          console.warn("Transaction ownership mismatch", {
            reference,
            metadataUserId,
            authenticatedUserId,
          })
          return jsonWithCors(
            request,
            { status: false, error: "Transaction does not belong to this account" },
            { status: 403 },
          )
        }

        const supabase = createAdminClient()
        const record = buildSubscriptionUpsert(data.data, authenticatedUserId)

        await supabase
          .from("subscriptions")
          .upsert(record as SubscriptionInsert, { onConflict: "id" })
          .select()
          .returns<SubscriptionInsert>()

        revalidateByTag(CACHE_TAGS.SUBSCRIPTIONS)
        revalidatePath("/subscriptions")
      } catch (dbError) {
        console.error("Error storing subscription:", dbError)
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
