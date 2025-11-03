export interface WordPressRestMediaDetails {
  width?: number
  height?: number
}

export interface WordPressRestCaption {
  rendered?: string
}

export interface WordPressRestMedia {
  id?: number
  source_url?: string
  alt_text?: string
  caption?: string | WordPressRestCaption
  media_details?: WordPressRestMediaDetails | null
}

export interface WordPressRestAuthor {
  id?: number
  name?: string
  slug?: string
  description?: string
  avatar_urls?: Record<string, string | undefined>
}

export interface WordPressRestTerm {
  id?: number
  taxonomy?: string
  name?: string
  slug?: string
  description?: string
  count?: number
}

export interface WordPressRestPost {
  id?: number
  slug?: string
  date?: string
  modified?: string
  link?: string
  title?: { rendered?: string } | null
  excerpt?: { rendered?: string } | null
  content?: { rendered?: string } | null
  _embedded?: {
    author?: Array<WordPressRestAuthor | null | undefined>
    "wp:featuredmedia"?: Array<WordPressRestMedia | null | undefined>
    "wp:term"?: Array<Array<WordPressRestTerm | null | undefined> | null | undefined>
  }
}

