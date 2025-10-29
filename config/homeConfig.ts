// Configuration for homepage sections and categories

export interface CategoryConfig {
  name: string
  layout: "grid" | "list" | "horizontal" | "vertical"
  typeOverride?: string
  priority?: number
}

export const categoryConfigs: CategoryConfig[] = [
  {
    name: "News",
    layout: "grid",
    typeOverride: "news",
    priority: 1,
  },
  {
    name: "Business",
    layout: "horizontal",
    typeOverride: "business",
    priority: 2,
  },
  {
    name: "Sport",
    layout: "grid",
    typeOverride: "sport",
    priority: 3,
  },
  {
    name: "Entertainment",
    layout: "horizontal",
    typeOverride: "entertainment",
    priority: 4,
  },
  {
    name: "Life",
    layout: "grid",
    typeOverride: "lifestyle",
    priority: 5,
  },
  {
    name: "Health",
    layout: "horizontal",
    typeOverride: "health",
    priority: 6,
  },
  {
    name: "Politics",
    layout: "grid",
    typeOverride: "politics",
    priority: 7,
  },
  {
    name: "Food",
    layout: "horizontal",
    typeOverride: "food",
    priority: 8,
  },
  {
    name: "Opinion",
    layout: "list",
    typeOverride: "opinion",
    priority: 9,
  },
]

// Homepage content configuration
export const homePageConfig = {
  heroSection: {
    enabled: true,
    requiresFpTag: true,
    fallbackToLatest: false,
  },
  verticalCards: {
    enabled: true,
    count: 3,
    requiresFpTag: true,
    startOffset: 5, // Start after hero and secondary stories
  },
  secondaryStories: {
    enabled: true,
    count: 4,
    requiresFpTag: true,
    startOffset: 1, // Start after hero
  },
  categorySection: {
    enabled: true,
    maxCategories: 9,
    postsPerCategory: 5,
  },
}

// Tag configuration for filtering
export const tagConfig = {
  featuredTag: "fp",
  alternativeTags: ["featured", "front-page"],
  caseSensitive: false,
}

// Error messages and fallback content
export const contentMessages = {
  noFeaturedPosts: "Featured Content Coming Soon",
  noFeaturedPostsDescription: "We're preparing featured stories for you. Please check back later.",
  offline: "You are currently offline. Some content may not be up to date.",
  loadingError: "Unable to load content",
  loadingErrorDescription: "We're experiencing technical difficulties. Please try again later.",
  noContent: "No Content Available",
  noContentDescription: "Please check back later for the latest news and updates.",
}
