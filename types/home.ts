export interface HomePost {
  id: string
  globalRelayId?: string
  slug: string
  title: string
  excerpt: string
  date: string
  country?: string
  featuredImage?: {
    node?: {
      sourceUrl?: string
      altText?: string
    }
  }
}

export interface CountryPosts {
  [countryCode: string]: HomePost[]
}

export interface PanAfricanSpotlightPayload {
  country: string
  posts: HomePost[]
}

export interface HomePageData {
  taggedPosts: HomePost[]
  recentPosts: HomePost[]
  countryPosts: CountryPosts
  featuredPosts: HomePost[]
}
