import type { Database } from "@/types/supabase"

export type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"]
export type BookmarkCollection = Database["public"]["Tables"]["bookmark_collections"]["Row"]
export type BookmarkUserCounter = Database["public"]["Tables"]["bookmark_user_counters"]["Row"]

export type Comment = Database["public"]["Tables"]["comments"]["Row"]

export interface CommentReport {
  id: string
  comment_id: string
  reason: string | null
  created_at: string
}

export interface CommentPostCounter {
  wp_post_id: number
  edition_code: string
  total_comments: number
  approved_comments: number
  updated_at: string
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface WPPostCache {
  edition_code: string
  wp_post_id: number
  slug: string
  title: string
  excerpt: string | null
  featured_image_url: string | null
  published_at: string | null
  cached_at: string | null
}

export interface AppWriteEvent {
  id: string
  user_id: string | null
  action: string
  key: string | null
  created_at: string
}

export interface CommentWithProfile extends Comment {
  profiles: {
    display_name: string | null
    avatar_url: string | null
  } | null
}
