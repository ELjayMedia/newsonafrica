import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get("type")

  const admin = createAdminClient()
  let query = admin.from("payments").select("user_id,type,reference,amount,status,created_at")
  if (type) {
    query = query.eq("type", type)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const header = ["user_id", "type", "reference", "amount", "status", "created_at"]
  const rows = (data || []).map((p) => [p.user_id ?? "", p.type, p.reference, p.amount, p.status, p.created_at])
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=payments.csv",
    },
  })
}
