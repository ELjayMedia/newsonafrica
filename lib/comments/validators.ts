import { AFRICAN_EDITION, SUPPORTED_EDITIONS } from "@/lib/editions"
import { ValidationError, addValidationError, hasValidationErrors, type FieldErrors } from "@/lib/validation"
import { validateRichTextFormatting } from "@/lib/comments/rich-text"

export const COMMENT_STATUSES = ["active", "pending", "flagged", "deleted", "all"] as const
export const COMMENT_ACTIONS = ["report", "delete", "approve"] as const
export type CommentStatus = (typeof COMMENT_STATUSES)[number]
export type CommentAction = (typeof COMMENT_ACTIONS)[number]

const STATUS_SET = new Set(COMMENT_STATUSES)
const ACTION_SET = new Set(COMMENT_ACTIONS)
const SUPPORTED_EDITION_CODES = new Set(SUPPORTED_EDITIONS.map((e) => e.code.toLowerCase()))

export function normalizeEditionCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return SUPPORTED_EDITION_CODES.has(normalized) ? normalized : null
}

function parseParentId(value: string | null): string | null | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.toLowerCase() === "null") return null
  return trimmed
}

export function validateGetCommentsParams(searchParams: URLSearchParams) {
  const errors: FieldErrors = {}

  const rawPostId = searchParams.get("wp_post_id") ?? searchParams.get("wpPostId") ?? searchParams.get("postId")
  const wpPostId = typeof rawPostId === "string" && rawPostId.trim() ? rawPostId.trim() : null
  if (!wpPostId) addValidationError(errors, "wp_post_id", "WordPress post ID is required")

  const rawEdition = searchParams.get("edition_code") ?? searchParams.get("editionCode") ?? searchParams.get("country")
  const normalizedEdition = rawEdition ? normalizeEditionCode(rawEdition) : null
  if (rawEdition && !normalizedEdition) addValidationError(errors, "edition_code", "Edition code is invalid")
  const editionCode = normalizedEdition ?? AFRICAN_EDITION.code

  const rawPage = searchParams.get("page")
  let page = 0
  if (rawPage != null) {
    const parsed = Number.parseInt(rawPage, 10)
    if (Number.isNaN(parsed) || parsed < 0) addValidationError(errors, "page", "Page must be a non-negative integer")
    else page = parsed
  }

  const rawLimit = searchParams.get("limit")
  let limit = 10
  if (rawLimit != null) {
    const parsed = Number.parseInt(rawLimit, 10)
    if (Number.isNaN(parsed) || parsed <= 0) addValidationError(errors, "limit", "Limit must be a positive integer")
    else if (parsed > 50) addValidationError(errors, "limit", "Limit cannot be greater than 50")
    else limit = parsed
  }

  const parentId = parseParentId(searchParams.get("parent_id") ?? searchParams.get("parentId"))

  const rawCursor = searchParams.get("cursor")
  const cursor = rawCursor && rawCursor.trim() ? rawCursor.trim() : undefined

  const rawStatus = searchParams.get("status")
  const status = rawStatus ? rawStatus.trim() : "active"
  if (status && !STATUS_SET.has(status as CommentStatus)) addValidationError(errors, "status", "Invalid status value")

  if (hasValidationErrors(errors) || !wpPostId) throw new ValidationError("Invalid query parameters", errors)

  return { wpPostId, editionCode, page, limit, parentId, cursor, status: status as CommentStatus }
}

export function validateCommentBodyFormatting(body: string, isRichText: boolean): string | null {
  if (!isRichText) return null
  return validateRichTextFormatting(body)
}

export function validateCreateCommentPayload(payload: unknown) {
  if (payload == null || typeof payload !== "object") {
    throw new ValidationError("Invalid request body", { body: ["Expected an object payload"] })
  }

  const record = payload as Record<string, unknown>
  const errors: FieldErrors = {}

  const rawPostId =
    (typeof record.wp_post_id === "string" && record.wp_post_id.trim() ? record.wp_post_id : null) ??
    (typeof record.wpPostId === "string" && record.wpPostId.trim() ? record.wpPostId : null) ??
    (typeof record.postId === "string" && record.postId.trim() ? record.postId : null)

  if (!rawPostId) addValidationError(errors, "wp_post_id", "WordPress post ID is required")

  const rawEdition =
    (typeof record.edition_code === "string" ? record.edition_code : null) ??
    (typeof record.editionCode === "string" ? record.editionCode : null)

  const editionCode = rawEdition ? normalizeEditionCode(rawEdition) : null
  if (rawEdition && !editionCode) addValidationError(errors, "edition_code", "Edition code is invalid")

  const bodyValue =
    (typeof record.body === "string" ? record.body : null) ??
    (typeof record.content === "string" ? record.content : null)

  if (!bodyValue || bodyValue.length === 0) addValidationError(errors, "body", "Comment body is required")
  else if (bodyValue.length > 2000) addValidationError(errors, "body", "Comment is too long")

  let parentId: string | null | undefined
  const rawParent = record.parent_id !== undefined ? record.parent_id : (record.parentId as unknown | undefined)
  if (rawParent === null) parentId = null
  else if (typeof rawParent === "string") parentId = rawParent
  else if (rawParent !== undefined) addValidationError(errors, "parent_id", "Parent ID must be a string or null")

  const isRichText = record.is_rich_text === true || record.isRichText === true
  if (bodyValue) {
    const formattingError = validateCommentBodyFormatting(bodyValue, isRichText)
    if (formattingError) addValidationError(errors, "body", formattingError)
  }

  if (hasValidationErrors(errors) || !rawPostId || !bodyValue) {
    throw new ValidationError("Invalid comment payload", errors)
  }

  return { wpPostId: rawPostId, editionCode, body: bodyValue, parentId, isRichText }
}

export function validateUpdateCommentPayload(payload: unknown) {
  if (payload == null || typeof payload !== "object") {
    throw new ValidationError("Invalid request body", { body: ["Expected an object payload"] })
  }

  const record = payload as Record<string, unknown>
  const errors: FieldErrors = {}

  const id = typeof record.id === "string" && record.id.length > 0 ? record.id : null
  if (!id) addValidationError(errors, "id", "Comment ID is required")

  const action = typeof record.action === "string" ? record.action : null
  if (!action || !ACTION_SET.has(action as CommentAction)) addValidationError(errors, "action", "Invalid action")

  const reasonValue = record.reason
  let reason: string | undefined
  if (reasonValue === undefined) reason = undefined
  else if (typeof reasonValue === "string") reason = reasonValue
  else addValidationError(errors, "reason", "Reason must be a string")

  if ((action as CommentAction) === "report" && (!reason || reason.length === 0)) {
    addValidationError(errors, "reason", "Report reason is required")
  }

  if (hasValidationErrors(errors) || !id || !action) {
    throw new ValidationError("Invalid comment update payload", errors)
  }

  return { id, action: action as CommentAction, reason }
}
