import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { buildInitializePayload, parseInitializeRequest } from "../_shared/paystack.ts"

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  )

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user?.email) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 })
  }

  let requestBody: unknown
  try {
    requestBody = await req.json()
  } catch (_err) {
    requestBody = {}
  }

  let plan
  let metadata: Record<string, any>
  try {
    const parsed = parseInitializeRequest(requestBody)
    plan = parsed.plan
    metadata = { ...parsed.metadata }
  } catch (error) {
    return jsonResponse({ error: (error as Error).message || "Invalid request" }, { status: 400 })
  }

  if (authData.user.id && !metadata.user_id) {
    metadata.user_id = authData.user.id
  }
  if (!metadata.subscriber_email) {
    metadata.subscriber_email = authData.user.email
  }

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY")
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not configured")
    return jsonResponse({ error: "Payment provider not configured" }, { status: 500 })
  }

  const payload = buildInitializePayload(authData.user.email, plan, metadata)

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    return jsonResponse(data, { status: res.status })
  } catch (error) {
    console.error("Failed to initialize Paystack transaction", error)
    return jsonResponse({ error: "Failed to initialize transaction" }, { status: 502 })
  }
})
