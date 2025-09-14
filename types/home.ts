import type { Post } from "./content"

export interface HomePost extends Post {}

export interface CountryPosts {
  [countryCode: string]: HomePost[]
}

export interface HomePageData {
  posts: HomePost[]
  countryPosts: CountryPosts
  featuredPosts: HomePost[]
}
