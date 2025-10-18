import type { HomePost } from "@/types/home"
import type {
  WordPressAuthor,
  WordPressCategory,
  WordPressMediaNode,
  WordPressPost,
  WordPressTag,
} from "@/types/wp"

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

export type WordPressImage = WordPressMediaNode

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

export type {
  WordPressAuthor,
  WordPressCategory,
  WordPressPost,
  WordPressTag,
} from "@/types/wp"
