import { NextRequest, NextResponse } from "next/server"
import { fetchCategories } from "@/lib/wordpress-api"

export const runtime = "edge"
export const revalidate = 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country") || undefined
  const cats = await fetchCategories(country ?? undefined)
  return NextResponse.json(cats)
}
