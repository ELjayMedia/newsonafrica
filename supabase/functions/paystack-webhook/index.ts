// @ts-nocheck
// Supabase Edge Function: paystack-webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifySignature(req: Request, secret: string) {
  const text = await req.text()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(text))
  const hash = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("")
  return { payload: text, hash }
}

serve(async (req) => {
  const secret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET")!
  const sigHeader = req.headers.get("x-paystack-signature") || ""
  const { payload, hash } = await verifySignature(req.clone(), secret)
  if (hash !== sigHeader) {
    return new Response("Invalid signature", { status: 400 })
  }

  const event = JSON.parse(payload)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  if (event?.data?.customer?.email) {
    const userRes = await supabase
      .from('profiles')
      .select('id')
      .eq('email', event.data.customer.email)
      .maybeSingle()
    const userId = userRes.data?.id
    if (userId) {
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_code: event.data.plan?.plan_code,
        provider_customer_id: event.data.customer?.customer_code,
        provider_sub_id: event.data.subscription_code,
        status: event.event,
        current_period_end: event.data.current_period_end,
      })
    }
  }

  return new Response("ok", { status: 200 })
})
