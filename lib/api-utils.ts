import type { NextApiResponse } from "next"

export function setCacheHeaders(res: NextApiResponse, maxAge = 60) {
  res.setHeader("Cache-Control", `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
}
