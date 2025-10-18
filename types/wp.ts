export interface WordPressMediaDetails {
  width?: number
  height?: number
}

export interface WordPressMediaNode {
  sourceUrl?: string
  altText?: string
  caption?: string
  mediaDetails?: WordPressMediaDetails
}

export interface WordPressMedia {
  node?: WordPressMediaNode
}

export interface WordPressAuthorNode {
  id?: number
  databaseId?: number
  name?: string
  slug?: string
  avatar?: { url?: string }
}

export interface WordPressAuthor {
  node?: WordPressAuthorNode
}

export interface WordPressCategory {
  id?: number
  databaseId?: number
  name?: string
  slug?: string
  description?: string
  count?: number
}

export interface WordPressCategoryConnection {
  nodes?: WordPressCategory[]
}

export interface WordPressTag {
  id?: number
  databaseId?: number
  name?: string
  slug?: string
}

export interface WordPressTagConnection {
  nodes?: WordPressTag[]
}

export interface WordPressPost {
  id?: string
  databaseId?: number
  globalRelayId?: string
  slug?: string
  title?: string
  excerpt?: string
  content?: string
  date?: string
  author?: WordPressAuthor
  featuredImage?: WordPressMedia
  categories?: WordPressCategoryConnection
  tags?: WordPressTagConnection
}

export interface WordPressPaginationInfo {
  total?: number
  totalPages?: number
  perPage?: number
  currentPage?: number
  hasNextPage?: boolean
  endCursor?: string | null
}
