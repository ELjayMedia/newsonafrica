export interface SearchResultItem {
  id: string
  slug?: string
  title: string
  excerpt: string
  categories: string[]
  country?: string
  publishedAt?: string
}

export interface SearchApiResponse {
  results: SearchResultItem[]
  total: number
  totalPages: number
  currentPage: number
  hasMore: boolean
  query: string
  suggestions?: string[]
  searchTime?: number
  performance?: {
    responseTime: number
    source?: string
  }
}
