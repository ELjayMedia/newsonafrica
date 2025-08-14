import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { applyRateLimit, handleApiError, successResponse } from '@/lib/api-utils';
import { fetchPosts } from '@/lib/wordpress-api';

// Input validation schema
const querySchema = z.object({
  page: z.coerce.number().positive().default(1),
  per_page: z.coerce.number().positive().max(100).default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  author: z.string().optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 20, 'POSTS_API_CACHE_TOKEN');
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validatedParams = querySchema.parse(params);

    // Fetch posts with validated parameters
    const posts = await fetchPosts({
      page: validatedParams.page,
      perPage: validatedParams.per_page,
      category: validatedParams.category,
      tag: validatedParams.tag,
      search: validatedParams.search,
      author: validatedParams.author,
      featured: validatedParams.featured,
    });

    // Return successful response with pagination metadata
    return successResponse(posts.data, {
      pagination: {
        page: validatedParams.page,
        perPage: validatedParams.per_page,
        hasNextPage: posts.pageInfo?.hasNextPage ?? false,
        hasPrevPage: validatedParams.page > 1,
        endCursor: posts.pageInfo?.endCursor ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
