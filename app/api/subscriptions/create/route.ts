import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { reference, planId } = await request.json()
    if (!reference || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createClient(cookies())
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 })
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      },
    )
    const verifyData = await verifyRes.json()
    if (!verifyRes.ok || !verifyData.status) {
      return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 })
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", planId)
      .single()
    if (planError || !plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: session.user.id,
        plan_id: plan.id,
        plan_name: plan.name,
        provider: "paystack",
        status: "active",
        paystack_customer_id: verifyData.data.customer?.customer_code,
        paystack_authorization_code: verifyData.data.authorization?.authorization_code,
        reference,
      })
      .select()
      .single()

    if (subError || !subscription) {
      console.error("Subscription insert error", subError)
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
    }

    await supabase.from("payments").insert({
      subscription_id: subscription.id,
      paystack_charge_id: String(verifyData.data.id),
      amount: verifyData.data.amount,
      currency: verifyData.data.currency,
      status: verifyData.data.status,
      paid_at: verifyData.data.paid_at,
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error("Error creating subscription:", error)
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }
}
