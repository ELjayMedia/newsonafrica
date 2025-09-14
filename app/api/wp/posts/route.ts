import { NextRequest, NextResponse } from "next/server"
import { fetchPosts, resolveCountryTermId } from "@/lib/wp"

export const runtime = "edge"
export const revalidate = 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country") || undefined
  const section = searchParams.get("section") || undefined
  const page = Number(searchParams.get("page") || "1")
  const perPage = Number(searchParams.get("per_page") || "10")
  const idsParam = searchParams.get("ids")
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined

  const opts: any = { section, page, perPage, ids }

  if (country) {
    if (country.length === 2) {
      opts.countryIso = country
    } else {
      const termId = await resolveCountryTermId(country)
      if (termId) opts.countryTermId = termId
    }
  }

  const data = await fetchPosts(opts)
  return NextResponse.json(data)
}
