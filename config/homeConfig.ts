// Configuration for homepage sections and categories

export interface CategoryConfig {
  name: string;
  slug: string;
  layout: 'grid' | 'list' | 'horizontal' | 'vertical';
  typeOverride?: string;
  showAdAfter?: boolean;
  priority?: number;
}

export const categoryConfigs: CategoryConfig[] = [
  {
    name: 'News',
    slug: 'news',
    layout: 'grid',
    typeOverride: 'news',
    showAdAfter: false,
    priority: 1,
  },
  {
    name: 'Business',
    slug: 'business',
    layout: 'horizontal',
    typeOverride: 'business',
    showAdAfter: true,
    priority: 2,
  },
  {
    name: 'Sport',
    slug: 'sport',
    layout: 'grid',
    typeOverride: 'sport',
    showAdAfter: false,
    priority: 3,
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    layout: 'horizontal',
    typeOverride: 'entertainment',
    showAdAfter: true,
    priority: 4,
  },
  {
    name: 'Life',
    slug: 'lifestyle',
    layout: 'grid',
    typeOverride: 'lifestyle',
    showAdAfter: false,
    priority: 5,
  },
  {
    name: 'Health',
    slug: 'health',
    layout: 'horizontal',
    typeOverride: 'health',
    showAdAfter: false,
    priority: 6,
  },
  {
    name: 'Politics',
    slug: 'politics',
    layout: 'grid',
    typeOverride: 'politics',
    showAdAfter: true,
    priority: 7,
  },
  {
    name: 'Food',
    slug: 'food',
    layout: 'horizontal',
    typeOverride: 'food',
    showAdAfter: false,
    priority: 8,
  },
  {
    name: 'Opinion',
    slug: 'opinion',
    layout: 'list',
    typeOverride: 'opinion',
    showAdAfter: false,
    priority: 9,
  },
];

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
  ads: {
    afterHero: true,
    midContent: true,
    footer: true,
  },
};

// Tag configuration for filtering
export const tagConfig = {
  featuredTag: 'fp',
  alternativeTags: ['featured', 'front-page'],
  caseSensitive: false,
};

// Error messages and fallback content
export const contentMessages = {
  noFeaturedPosts: 'Featured Content Coming Soon',
  noFeaturedPostsDescription: "We're preparing featured stories for you. Please check back later.",
  offline: 'You are currently offline. Some content may not be up to date.',
  loadingError: 'Unable to load content',
  loadingErrorDescription: "We're experiencing technical difficulties. Please try again later.",
  noContent: 'No Content Available',
  noContentDescription: 'Please check back later for the latest news and updates.',
};

export type { CategoryConfig };
