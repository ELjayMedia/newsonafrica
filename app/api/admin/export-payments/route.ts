import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payments")
    .select("reference,amount,status,created_at,subscriptions(user_id)")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const header = ["user_id", "reference", "amount", "status", "created_at"]
  const rows = (data || []).map((p) => [
    p.subscriptions?.user_id ?? "",
    p.reference,
    p.amount,
    p.status,
    p.created_at,
  ])
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=payments.csv",
    },
  })
}
