/**
 * WordPress Post interface
 */
export interface Post {
  /**
   * Unique identifier for the post
   */
  id: number
  /**
   * Post title
   */
  title: {
    rendered: string
  }
  /**
   * Post content
   */
  content: {
    rendered: string
    protected: boolean
  }
  /**
   * Post excerpt
   */
  excerpt: {
    rendered: string
  }
  /**
   * Post slug for URL
   */
  slug: string
  /**
   * Post status (publish, draft, etc.)
   */
  status: "publish" | "draft" | "pending" | "private"
  /**
   * Post type
   */
  type: "post" | "page" | "attachment"
  /**
   * Post author ID
   */
  author: number
  /**
   * Featured media ID
   */
  featured_media: number
  /**
   * Post categories
   */
  categories: number[]
  /**
   * Post tags
   */
  tags: number[]
  /**
   * Post date
   */
  date: string
  /**
   * Post modified date
   */
  modified: string
  /**
   * Post link
   */
  link: string
  /**
   * Post format
   */
  format: "standard" | "aside" | "gallery" | "link" | "image" | "quote" | "status" | "video" | "audio" | "chat"
  /**
   * Post meta data
   */
  meta: Record<string, any>
  /**
   * Whether comments are allowed
   */
  comment_status: "open" | "closed"
  /**
   * Featured image URL (added by custom code)
   */
  featured_image_url?: string
  /**
   * Author data (added by custom code)
   */
  author_data?: Author
  /**
   * Category data (added by custom code)
   */
  category_data?: Category[]
}

/**
 * WordPress Category interface
 */
export interface Category {
  /**
   * Unique identifier for the category
   */
  id: number
  /**
   * Category count
   */
  count: number
  /**
   * Category description
   */
  description: string
  /**
   * Category link
   */
  link: string
  /**
   * Category name
   */
  name: string
  /**
   * Category slug
   */
  slug: string
  /**
   * Category taxonomy
   */
  taxonomy: "category"
  /**
   * Parent category ID
   */
  parent: number
  /**
   * Category meta data
   */
  meta: Record<string, any>
  /**
   * Category image URL (added by custom code)
   */
  image_url?: string
}

/**
 * WordPress Tag interface
 */
export interface Tag {
  /**
   * Unique identifier for the tag
   */
  id: number
  /**
   * Tag count
   */
  count: number
  /**
   * Tag description
   */
  description: string
  /**
   * Tag link
   */
  link: string
  /**
   * Tag name
   */
  name: string
  /**
   * Tag slug
   */
  slug: string
  /**
   * Tag taxonomy
   */
  taxonomy: "post_tag"
  /**
   * Tag meta data
   */
  meta: Record<string, any>
}

/**
 * WordPress Author interface
 */
export interface Author {
  /**
   * Unique identifier for the author
   */
  id: number
  /**
   * Author name
   */
  name: string
  /**
   * Author URL
   */
  url: string
  /**
   * Author description
   */
  description: string
  /**
   * Author link
   */
  link: string
  /**
   * Author slug
   */
  slug: string
  /**
   * Author avatar URLs
   */
  avatar_urls: {
    "24": string
    "48": string
    "96": string
  }
  /**
   * Author meta data
   */
  meta: Record<string, any>
}

/**
 * WordPress Comment interface
 */
export interface Comment {
  /**
   * Unique identifier for the comment
   */
  id: number
  /**
   * Post ID the comment belongs to
   */
  post: number
  /**
   * Parent comment ID
   */
  parent: number
  /**
   * Comment author ID
   */
  author: number
  /**
   * Comment author name
   */
  author_name: string
  /**
   * Comment author URL
   */
  author_url: string
  /**
   * Comment date
   */
  date: string
  /**
   * Comment content
   */
  content: {
    rendered: string
  }
  /**
   * Comment status
   */
  status: "approved" | "hold" | "spam" | "trash"
  /**
   * Comment type
   */
  type: "comment"
  /**
   * Author avatar URLs
   */
  author_avatar_urls: {
    "24": string
    "48": string
    "96": string
  }
  /**
   * Comment meta data
   */
  meta: Record<string, any>
}

/**
 * WordPress API Response interface
 */
export interface WPResponse<T> {
  /**
   * Response data
   */
  data: T
  /**
   * Response headers
   */
  headers: Headers
  /**
   * Response status
   */
  status: number
}
