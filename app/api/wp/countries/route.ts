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

export async function GET(req: NextRequest) {
  logRequest(req)
  const gqlResult = await fetchWordPressGraphQL<CountriesQueryResult>(
    ENV.NEXT_PUBLIC_DEFAULT_SITE,
    COUNTRIES_QUERY,
    { first: 100 },
  )
  const nodes = gqlResult?.countries?.nodes ?? []
  const data = nodes
    .map((node) => {
      const id = typeof node?.databaseId === "number" ? node.databaseId : null
      const slug = typeof node?.slug === "string" ? node.slug : null
      if (id === null || !slug) {
        return null
      }
      return { id, slug }
    })
    .filter((node): node is { id: number; slug: string } => Boolean(node))
  return jsonWithCors(req, data)
}
