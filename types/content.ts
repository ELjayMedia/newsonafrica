export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  count?: number
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export interface Post {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  content?: string
  featuredImage?: {
    node: {
      sourceUrl: string
      altText?: string
    }
  }
  author: {
    node: {
      name: string
      slug?: string
    }
  }
  categories: {
    nodes: Category[]
  }
  tags?: {
    nodes: Tag[]
  }
}
