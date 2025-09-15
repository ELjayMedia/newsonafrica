import { NextRequest, NextResponse } from "next/server"
import { fetchCategories } from "@/lib/wp"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

export const runtime = "edge"
export const revalidate = 60

export async function GET(req: NextRequest) {
  logRequest(req)
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country") || undefined
  const cats = await fetchCategories(country ?? undefined)
  return jsonWithCors(req, cats)
}
