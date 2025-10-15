export * from "./wordpress/frontpage"
export * from "./wordpress/categories"
export * from "./wordpress/posts"
export * from "./wordpress/authors"
export {
  DEFAULT_COUNTRY,
  FP_TAG_SLUG,
  mapPostsToHomePosts,
  mapWordPressPostToHomePost,
  mapGraphqlNodeToHomePost,
  resolveHomePostId,
} from "./wordpress/shared"

export type {
  AggregatedHomeData,
  CategoryPostsResult,
  FrontPageSlicesResult,
  PaginatedPostsResult,
  WordPressAuthor,
  WordPressCategory,
  WordPressImage,
  WordPressTag,
} from "./wordpress/types"

export { COUNTRIES, executeRestFallback, fetchFromWp, fetchFromWpGraphQL } from "./wordpress/client"
export type { CountryConfig, WordPressPost } from "./wordpress/client"

import { getRestBase } from "./wp-endpoints"

export interface UpdateUserProfilePayload {
  [key: string]: unknown
}

export interface UpdateUserProfileSuccess {
  ok: true
  status: number
  data: unknown
}

export interface UpdateUserProfileErrorDetails {
  message: string
  code?: string
  data?: Record<string, unknown>
  raw?: unknown
}

export interface UpdateUserProfileFailure {
  ok: false
  status: number
  error: UpdateUserProfileErrorDetails
}

export type UpdateUserProfileResult = UpdateUserProfileSuccess | UpdateUserProfileFailure

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    console.warn("Failed to parse WordPress response as JSON", error)
    return text
  }
}

const normalizeWordPressError = (
  payload: unknown,
  fallbackMessage: string,
): UpdateUserProfileErrorDetails => {
  if (!payload || typeof payload !== "object") {
    return { message: fallbackMessage, raw: payload }
  }

  const { message, code, data } = payload as {
    message?: unknown
    code?: unknown
    data?: unknown
  }

  return {
    message: typeof message === "string" ? message : fallbackMessage,
    code: typeof code === "string" ? code : undefined,
    data: typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined,
    raw: payload,
  }
}

export async function updateUserProfile(
  token: string,
  payload: UpdateUserProfilePayload,
): Promise<UpdateUserProfileResult> {
  const restBase = getRestBase()
  const url = `${restBase}/users/me`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const parsed = await parseJsonSafely(response)

  if (!response.ok) {
    const error = normalizeWordPressError(
      parsed,
      `WordPress rejected the profile update with status ${response.status}`,
    )

    const statusFromPayload =
      typeof error.data === "object" && error.data !== null && "status" in error.data
        ? Number((error.data as Record<string, unknown>).status)
        : undefined

    return {
      ok: false,
      status: Number.isFinite(statusFromPayload) ? (statusFromPayload as number) : response.status,
      error,
    }
  }

  return {
    ok: true,
    status: response.status,
    data: parsed,
  }
}
