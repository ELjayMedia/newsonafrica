import type { NextRequest } from "next/server"
import { fetchWordPressGraphQL } from "@/lib/wordpress/client"
import { COUNTRIES_QUERY } from "@/lib/wordpress/queries"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { ENV } from "@/config/env"

export const runtime = "nodejs"
// Cache policy: short (1 minute)
export const revalidate = 60

type CountriesQueryResult = {
  countries?: {
    nodes?: Array<{
      databaseId?: number | null
      slug?: string | null
    }> | null
  } | null
}

type CountryRow = { id: number; slug: string }

const isSuccessResult = <T,>(
  result: unknown,
): result is { ok: true; data: T } => {
  return Boolean(result && typeof result === "object" && (result as any).ok === true && "data" in (result as any))
}

export async function GET(req: NextRequest) {
  logRequest(req)

  const gqlResult = await fetchWordPressGraphQL<CountriesQueryResult>(
    ENV.NEXT_PUBLIC_DEFAULT_SITE,
    COUNTRIES_QUERY,
    { first: 100 },
  )

  const payload: CountriesQueryResult | null = isSuccessResult<CountriesQueryResult>(gqlResult)
    ? gqlResult.data
    : null

  const nodes = payload?.countries?.nodes ?? []

  const data: CountryRow[] = nodes
    .map((node) => {
      const id = typeof node?.databaseId === "number" ? node.databaseId : null
      const slug = typeof node?.slug === "string" ? node.slug : null
      if (id === null || !slug) return null
      return { id, slug }
    })
    .filter((row): row is CountryRow => Boolean(row))

  return jsonWithCors(req, data)
}
