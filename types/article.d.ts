export interface Article {
  id: string
  databaseId?: number
  slug: string
  title: string
  content: string
  date: string
  excerpt?: string
  featuredImage?: {
    node: {
      sourceUrl: string
      mediaDetails?: {
        width?: number
        height?: number
      }
    }
  }
  author?: {
    node: {
      name: string
      firstName?: string
      lastName?: string
      avatar?: {
        url: string
      }
    }
  }
  categories?: {
    edges: Array<{
      node: {
        name: string
        slug: string
      }
    }>
  }
  readingTime?: string
}
