export type RelatedPost = {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  date?: string | null
  country?: string | null
  featuredImage?: {
    url?: string | null
    alt?: string | null
  } | null
}
