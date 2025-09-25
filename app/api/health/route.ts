import { NextResponse } from "next/server"
import { getWpEndpoints } from "@/config/wp"

async function ping(url: string) {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" })
    return { ok: res.ok, status: res.status }
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || String(e) }
  }
}

export async function GET() {
  const sites = ["sz", "za"]
  const checks: Record<string, any> = {}

  for (const site of sites) {
    const { rest, graphql } = getWpEndpoints(site)
    checks[site] = {
      rest: { url: rest, ...(await ping(rest)) },
      graphql: { url: graphql, ...(await ping(graphql)) },
    }
  }

  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_DEFAULT_SITE: process.env.NEXT_PUBLIC_DEFAULT_SITE,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_WORDPRESS_API_URL: process.env.NEXT_PUBLIC_WORDPRESS_API_URL,
      WORDPRESS_REST_API_URL: process.env.WORDPRESS_REST_API_URL,
    },
    checks,
    timestamp: new Date().toISOString(),
  })
}
