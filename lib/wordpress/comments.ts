"use server"

import * as log from "../log"
import { buildCacheTags } from "../cache/tag-utils"
import { fetchFromWp } from "./client"
import { DEFAULT_COUNTRY } from "./shared"
import type { WordPressComment } from "./types"

export async function fetchPendingComments(countryCode = DEFAULT_COUNTRY): Promise<WordPressComment[]> {
  const tags = buildCacheTags({ country: countryCode, section: "comments" })
  const comments = await fetchFromWp<WordPressComment[]>(
    countryCode,
    {
      endpoint: "comments",
      params: { status: "hold", per_page: 100, _embed: 1 },
    },
    { tags, auth: true, revalidate: false },
  )
  return comments || []
}

export async function approveComment(commentId: number, countryCode = DEFAULT_COUNTRY) {
  try {
    const res = await fetchFromWp<WordPressComment>(
      countryCode,
      {
        endpoint: `comments/${commentId}`,
        method: "POST",
        payload: { status: "approve" },
      },
      { auth: true, revalidate: false },
    )
    if (!res) throw new Error(`Failed to approve comment ${commentId}`)
    return res
  } catch (error) {
    log.error(`[v0] Failed to approve comment ${commentId}`, { error })
    throw error
  }
}

export async function deleteComment(commentId: number, countryCode = DEFAULT_COUNTRY) {
  try {
    const res = await fetchFromWp<WordPressComment>(
      countryCode,
      {
        endpoint: `comments/${commentId}`,
        method: "DELETE",
      },
      { auth: true, revalidate: false },
    )
    if (!res) throw new Error(`Failed to delete comment ${commentId}`)
    return res
  } catch (error) {
    log.error(`[v0] Failed to delete comment ${commentId}`, { error })
    throw error
  }
}
