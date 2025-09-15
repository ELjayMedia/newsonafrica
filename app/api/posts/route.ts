import { NextResponse } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { getPostsByCountry } from "@/lib/wp-data"

import {
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
} from "@/lib/wordpress-api"

export const revalidate = 60;

export async function GET(req: Request) {
  logRequest(req)
  const u = new URL(req.url)
  const country = (u.searchParams.get('country') || 'DEFAULT').toUpperCase();
  const section = u.searchParams.get('section') || undefined;
  try {
    const posts = await getPostsByCountry(country, { category: section, first: 20 })
    return jsonWithCors(req, posts?.nodes ?? [])
  } catch {
    const countryCode = country.toLowerCase();
    const restData = section
      ? await getPostsByCategoryForCountry(countryCode, section, 20)
      : await getLatestPostsForCountry(countryCode, 20);
    return jsonWithCors(req, restData.posts ?? restData, {
      status: 200,
      headers: { "x-wp-fallback": "true" },
    })
  }
}
