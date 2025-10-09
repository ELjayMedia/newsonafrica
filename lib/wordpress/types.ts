import type { HomePost } from "@/types/home"
import type { WordPressPost } from "./client"

export interface PaginatedPostsResult {
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface FrontPageSlicesResult {
  hero: {
    heroPost?: WordPressPost
    secondaryStories: WordPressPost[]
  }
  trending: PaginatedPostsResult
  latest: PaginatedPostsResult
}

export interface WordPressImage {
  sourceUrl?: string
  altText?: string
  mediaDetails?: {
    width?: number
    height?: number
  }
}

export interface WordPressAuthor {
  id: number
  name: string
  slug: string
  description?: string
  avatar?: { url?: string }
}

export interface WordPressCategory {
  id: number
  name: string
  slug: string
  description?: string
  count?: number
}

export interface WordPressTag {
  id: number
  name: string
  slug: string
}

export interface CategoryPostsResult {
  category: WordPressCategory | null
  posts: WordPressPost[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface WordPressComment {
  id: number
  author_name: string
  content: { rendered: string }
  date: string
  status: string
  post: number
}

export interface AggregatedHomeData {
  heroPost: HomePost | null
  secondaryPosts: HomePost[]
  remainingPosts: HomePost[]
}
