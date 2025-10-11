import type { CommentSortOption } from "@/lib/supabase-schema"

export type ThemePreference = "light" | "dark" | "system"

export type BookmarkSortPreference = "newest" | "oldest" | "title" | "unread"

export interface UserPreferences {
  theme: ThemePreference
  language: string
  emailNotifications: boolean
  pushNotifications: boolean
  sections: string[]
  blockedTopics: string[]
  countries: string[]
  commentSort: CommentSortOption
  bookmarkSort: BookmarkSortPreference
  lastSubscriptionPlan: string | null
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "en",
  emailNotifications: true,
  pushNotifications: true,
  sections: [],
  blockedTopics: [],
  countries: [],
  commentSort: "newest",
  bookmarkSort: "newest",
  lastSubscriptionPlan: null,
}
