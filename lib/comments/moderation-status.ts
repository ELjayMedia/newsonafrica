import type { Database } from "@/types/supabase"

export type CanonicalCommentStatus = Database["public"]["Enums"]["comment_status"]
export type ModerationFilterStatus = CanonicalCommentStatus | "all"

export const CANONICAL_COMMENT_STATUSES: CanonicalCommentStatus[] = [
  "pending",
  "active",
  "flagged",
  "hidden",
  "deleted",
  "approved",
  "spam",
]

const LEGACY_TO_CANONICAL_STATUS: Record<string, CanonicalCommentStatus> = {
  rejected: "deleted",
}

export const COMMENT_STATUS_LABELS: Record<ModerationFilterStatus, string> = {
  all: "All",
  pending: "Pending",
  active: "Active",
  flagged: "Flagged",
  hidden: "Hidden",
  deleted: "Deleted",
  approved: "Approved",
  spam: "Spam",
}

export function normalizeCommentStatus(status: string): CanonicalCommentStatus {
  const normalized = status.trim().toLowerCase()

  if ((CANONICAL_COMMENT_STATUSES as string[]).includes(normalized)) {
    return normalized as CanonicalCommentStatus
  }

  const mapped = LEGACY_TO_CANONICAL_STATUS[normalized]
  if (mapped) {
    return mapped
  }

  throw new Error(`Unsupported comment status: ${status}`)
}

export function normalizeCommentModerationFilter(status: string): ModerationFilterStatus {
  const normalized = status.trim().toLowerCase()

  if (normalized === "all") {
    return "all"
  }

  return normalizeCommentStatus(normalized)
}
