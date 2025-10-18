import { NextResponse, type NextRequest } from "next/server"

import { SUPPORTED_EDITIONS } from "@/lib/editions"

const SIX_MONTHS_IN_SECONDS = 15_552_000
const SUPPORTED_CODES = new Set(SUPPORTED_EDITIONS.map((edition) => edition.code))

export async function POST(request: NextRequest) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch (error) {
    console.error("[set-country] Failed to parse request body", error)
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const country = typeof payload === "object" && payload !== null ? (payload as { country?: unknown }).country : undefined

  if (typeof country !== "string") {
    return NextResponse.json({ error: "Country is required" }, { status: 400 })
  }

  const normalized = country.trim().toLowerCase()

  if (!SUPPORTED_CODES.has(normalized)) {
    return NextResponse.json({ error: "Unsupported country" }, { status: 400 })
  }

  const response = new NextResponse(null, { status: 204 })
  response.cookies.set({
    name: "country",
    value: normalized,
    maxAge: SIX_MONTHS_IN_SECONDS,
    path: "/",
    sameSite: "lax",
  })

  return response
}
