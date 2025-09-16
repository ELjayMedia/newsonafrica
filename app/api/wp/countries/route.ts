import { NextRequest, NextResponse } from "next/server"
import { getWpEndpoints } from "@/config/wp"


export const runtime = "edge"
// Cache policy: short (1 minute)
export const revalidate = 60

export async function GET(req: NextRequest) {
  logRequest(req)
  const base = getWpEndpoints(
    process.env.NEXT_PUBLIC_DEFAULT_SITE || "",
  ).rest
  const res = await fetch(`${base}/countries?per_page=100&_fields=id,slug`)
  const data = await res.json()
  return jsonWithCors(req, data)
}
