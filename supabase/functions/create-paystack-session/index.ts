// Supabase Edge Function: create-paystack-session
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan_code = body.plan_code
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY")!

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ email: user.email, plan: plan_code }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  })
})
