import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { paystackClient } from "@/lib/paystack-utils"

export async function POST() {
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, provider_subscription_id, status")

  let updated = 0
  if (subs) {
    for (const sub of subs) {
      if (sub.provider_subscription_id) {
        try {
          const remote = await paystackClient.getSubscription(
            sub.provider_subscription_id,
          )
          const newStatus = remote?.data?.status
          if (newStatus && newStatus !== sub.status) {
            await supabase
              .from("subscriptions")
              .update({ status: newStatus })
              .eq("id", sub.id)
            updated++
          }
        } catch (err) {
          console.error("Reconcile error", err)
        }
      }
    }
  }

  return NextResponse.json({ updated })
}
