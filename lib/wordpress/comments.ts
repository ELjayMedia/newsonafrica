import * as log from "../log"
import { buildCacheTags } from "../cache/tag-utils"
import { fetchFromWpGraphQL } from "./client"
import {
  APPROVE_COMMENT_MUTATION,
  DELETE_COMMENT_MUTATION,
  PENDING_COMMENTS_QUERY,
} from "./comment-queries"
import { DEFAULT_COUNTRY } from "./shared"
import type { WordPressComment } from "./types"

type GraphqlComment = {
  databaseId?: number | null
  content?: string | null
  date?: string | null
  status?: string | null
  author?: {
    node?: {
      name?: string | null
    } | null
  } | null
  commentedOn?: {
    node?: {
      databaseId?: number | null
    } | null
  } | null
}

type PendingCommentsQueryResult = {
  comments?: {
    nodes?: Array<GraphqlComment | null> | null
  } | null
}

type ApproveCommentMutationResult = {
  updateComment?: {
    comment?: GraphqlComment | null
  } | null
}

type DeleteCommentMutationResult = {
  deleteComment?: {
    deletedId?: string | null
    comment?: GraphqlComment | null
  } | null
}

const COMMENT_QUERY_PAGE_SIZE = 100

const encodeBase64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64")
  }

  if (typeof btoa === "function") {
    return btoa(value)
  }

  throw new Error("Base64 encoding is not supported in this environment")
}

const toCommentGlobalId = (commentId: number): string => {
  if (!Number.isInteger(commentId) || commentId <= 0) {
    throw new Error(`Invalid comment id: ${commentId}`)
  }
  return encodeBase64(`comment:${commentId}`)
}

const mapGraphqlCommentToWordPressComment = (
  node: GraphqlComment | null | undefined,
): WordPressComment | null => {
  if (!node || typeof node !== "object") {
    return null
  }

  const databaseId = typeof node.databaseId === "number" ? node.databaseId : null
  if (!databaseId) {
    return null
  }

  const content = typeof node.content === "string" ? node.content : ""
  const authorName = node.author?.node?.name
  const commentedOnId = node.commentedOn?.node?.databaseId

  return {
    id: databaseId,
    author_name: typeof authorName === "string" ? authorName : "",
    content: { rendered: content },
    date: typeof node.date === "string" ? node.date : "",
    status: typeof node.status === "string" ? node.status.toLowerCase() : "",
    post: typeof commentedOnId === "number" ? commentedOnId : 0,
  }
}

export async function fetchPendingComments(
  countryCode = DEFAULT_COUNTRY,
): Promise<WordPressComment[]> {
  const tags = buildCacheTags({ country: countryCode, section: "comments" })

  try {
    const data = await fetchFromWpGraphQL<PendingCommentsQueryResult>(
      countryCode,
      PENDING_COMMENTS_QUERY,
      { first: COMMENT_QUERY_PAGE_SIZE },
      tags,
    )

    if (!data) {
      log.error("[v0] Pending comments query returned no data", { countryCode })
      return []
    }

    const nodes = data.comments?.nodes ?? []

    return nodes
      .map((node) => mapGraphqlCommentToWordPressComment(node))
      .filter((comment): comment is WordPressComment => Boolean(comment))
  } catch (error) {
    log.error("[v0] Failed to fetch pending comments via GraphQL", {
      countryCode,
      error,
    })
    return []
  }
}

export async function approveComment(
  commentId: number,
  countryCode = DEFAULT_COUNTRY,
): Promise<WordPressComment> {
  const id = toCommentGlobalId(commentId)

  try {
    const data = await fetchFromWpGraphQL<ApproveCommentMutationResult>(
      countryCode,
      APPROVE_COMMENT_MUTATION,
      { id },
    )

    const comment = data?.updateComment?.comment
    const mapped = mapGraphqlCommentToWordPressComment(comment)

    if (!mapped) {
      log.error("[v0] Approve comment mutation did not return comment", {
        countryCode,
        commentId,
        response: data,
      })
      throw new Error(`Failed to approve comment ${commentId}`)
    }

    return mapped
  } catch (error) {
    log.error(`[v0] Failed to approve comment ${commentId} via GraphQL`, {
      countryCode,
      error,
    })
    throw error
  }
}

export async function deleteComment(
  commentId: number,
  countryCode = DEFAULT_COUNTRY,
): Promise<WordPressComment> {
  const id = toCommentGlobalId(commentId)

  try {
    const data = await fetchFromWpGraphQL<DeleteCommentMutationResult>(
      countryCode,
      DELETE_COMMENT_MUTATION,
      { id },
    )

    const comment = mapGraphqlCommentToWordPressComment(data?.deleteComment?.comment)

    if (!comment) {
      log.error("[v0] Delete comment mutation did not return comment", {
        countryCode,
        commentId,
        response: data,
      })
      throw new Error(`Failed to delete comment ${commentId}`)
    }

    return comment
  } catch (error) {
    log.error(`[v0] Failed to delete comment ${commentId} via GraphQL`, {
      countryCode,
      error,
    })
    throw error
  }
}
