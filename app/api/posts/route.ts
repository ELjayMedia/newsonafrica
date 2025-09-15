import { NextResponse } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { getPostsByCountry } from "@/lib/wp-data"
import * as log from "@/lib/log"

import {
  getLatestPostsForCountry,
  getPostsByCategoryForCountry,
} from '@/lib/wordpress-api';

const formatError = (error: unknown) =>
  error instanceof Error
    ? { message: error.message, name: error.name, stack: error.stack }
    : { error }


// Cache policy: short (1 minute)
export const revalidate = 60;

export async function GET(req: Request) {
  logRequest(req)
  const u = new URL(req.url)
  const country = (u.searchParams.get('country') || 'DEFAULT').toUpperCase();
  const section = u.searchParams.get('section') || undefined;
  try {
    const posts = await getPostsByCountry(country, { category: section, first: 20 })
    return jsonWithCors(req, posts?.nodes ?? [])
  } catch (primaryError) {
    const countryCode = country.toLowerCase();

    try {
      const restData = section
        ? await getPostsByCategoryForCountry(countryCode, section, 20)
        : await getLatestPostsForCountry(countryCode, 20);

      return jsonWithCors(req, restData.posts ?? restData, {
        status: 200,
        headers: { "x-wp-fallback": "true" },
      })
    } catch (fallbackError) {
      log.error('[v0] Posts API REST fallback failed', {
        countryCode,
        section,
        primaryError: formatError(primaryError),
        fallbackError: formatError(fallbackError),
      })

      return jsonWithCors(
        req,
        {
          error: {
            message: 'Unable to retrieve posts via fallback',
            code: 'REST_FALLBACK_FAILED',
          },
        },
        {
          status: 502,
          headers: { 'x-wp-fallback': 'error' },
        },
      )
    }
  }
}
