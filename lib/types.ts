export interface MetricReport {
  name: string
  value: number
  rating: string
  path: string
  navigationType: string
}

export interface Post {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  modified: string
  featuredImage?: {
    node: {
      sourceUrl: string
      altText: string
    }
  }
  author: {
    node: {
      name: string
      slug: string
      description: string
      avatar: {
        url: string
      }
    }
  }
  categories: {
    nodes: {
      name: string
      slug: string
    }[]
  }
  tags: {
    nodes: {
      name: string
      slug: string
    }[]
  }
  seo?: {
    title: string
    metaDesc: string
    opengraphImage?: {
      sourceUrl: string
    }
  }
  content?: string
}
