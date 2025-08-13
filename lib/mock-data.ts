import type { Post, Category, Author } from './types';

export const FALLBACK_AUTHORS: Author[] = [
  {
    id: 1,
    name: 'Editorial Team',
    slug: 'editorial-team',
    description: 'News On Africa Editorial Team',
    avatar_urls: {
      '24': '/placeholder.svg?height=24&width=24',
      '48': '/placeholder.svg?height=48&width=48',
      '96': '/placeholder.svg?height=96&width=96',
    },
  },
];

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'News', slug: 'news', parent: 0 },
  { id: 2, name: 'Business', slug: 'business', parent: 0 },
  { id: 3, name: 'Sport', slug: 'sport', parent: 0 },
  { id: 4, name: 'Entertainment', slug: 'entertainment', parent: 0 },
  { id: 5, name: 'Life', slug: 'life', parent: 0 },
  { id: 6, name: 'Health', slug: 'health', parent: 0 },
  { id: 7, name: 'Politics', slug: 'politics', parent: 0 },
  { id: 8, name: 'Food', slug: 'food', parent: 0 },
  { id: 9, name: 'Opinion', slug: 'opinion', parent: 0 },
];

export const FALLBACK_POSTS: Post[] = [
  {
    id: 1,
    date: new Date().toISOString(),
    date_gmt: new Date().toISOString(),
    guid: { rendered: 'https://newsonafrica.com/?p=1' },
    modified: new Date().toISOString(),
    modified_gmt: new Date().toISOString(),
    slug: 'welcome-to-news-on-africa',
    status: 'publish',
    type: 'post',
    link: 'https://newsonafrica.com/welcome-to-news-on-africa/',
    title: { rendered: 'Welcome to News On Africa' },
    content: {
      rendered:
        '<p>Welcome to News On Africa, your premier source for news from across the continent. We bring you the latest updates on politics, business, sports, entertainment, and more from all 54 African countries.</p>',
      protected: false,
    },
    excerpt: {
      rendered:
        '<p>Welcome to News On Africa, your premier source for news from across the continent.</p>',
      protected: false,
    },
    author: 1,
    featured_media: 0,
    comment_status: 'open',
    ping_status: 'open',
    sticky: false,
    template: '',
    format: 'standard',
    meta: [],
    categories: [1],
    tags: [],
    _embedded: {
      author: FALLBACK_AUTHORS,
      'wp:featuredmedia': [],
      'wp:term': [FALLBACK_CATEGORIES],
    },
  },
  {
    id: 2,
    date: new Date(Date.now() - 86400000).toISOString(),
    date_gmt: new Date(Date.now() - 86400000).toISOString(),
    guid: { rendered: 'https://newsonafrica.com/?p=2' },
    modified: new Date(Date.now() - 86400000).toISOString(),
    modified_gmt: new Date(Date.now() - 86400000).toISOString(),
    slug: 'african-economies-show-resilience',
    status: 'publish',
    type: 'post',
    link: 'https://newsonafrica.com/african-economies-show-resilience/',
    title: { rendered: 'African Economies Show Resilience Amid Global Challenges' },
    content: {
      rendered:
        '<p>Despite global economic headwinds, several African economies continue to demonstrate remarkable resilience and growth potential.</p>',
      protected: false,
    },
    excerpt: {
      rendered: '<p>African economies demonstrate resilience amid global challenges.</p>',
      protected: false,
    },
    author: 1,
    featured_media: 0,
    comment_status: 'open',
    ping_status: 'open',
    sticky: false,
    template: '',
    format: 'standard',
    meta: [],
    categories: [2],
    tags: [],
    _embedded: {
      author: FALLBACK_AUTHORS,
      'wp:featuredmedia': [],
      'wp:term': [[FALLBACK_CATEGORIES[1]]],
    },
  },
  {
    id: 3,
    date: new Date(Date.now() - 172800000).toISOString(),
    date_gmt: new Date(Date.now() - 172800000).toISOString(),
    guid: { rendered: 'https://newsonafrica.com/?p=3' },
    modified: new Date(Date.now() - 172800000).toISOString(),
    modified_gmt: new Date(Date.now() - 172800000).toISOString(),
    slug: 'african-sports-stars-shine',
    status: 'publish',
    type: 'post',
    link: 'https://newsonafrica.com/african-sports-stars-shine/',
    title: { rendered: 'African Sports Stars Shine on Global Stage' },
    content: {
      rendered:
        '<p>African athletes continue to make their mark in international competitions, bringing pride to the continent.</p>',
      protected: false,
    },
    excerpt: {
      rendered: '<p>African athletes excel in international competitions.</p>',
      protected: false,
    },
    author: 1,
    featured_media: 0,
    comment_status: 'open',
    ping_status: 'open',
    sticky: false,
    template: '',
    format: 'standard',
    meta: [],
    categories: [3],
    tags: [],
    _embedded: {
      author: FALLBACK_AUTHORS,
      'wp:featuredmedia': [],
      'wp:term': [[FALLBACK_CATEGORIES[2]]],
    },
  },
];

export const MOCK_HOMEPAGE_DATA = {
  featuredPost: FALLBACK_POSTS[0],
  secondaryPosts: FALLBACK_POSTS.slice(1, 3),
  categoryPosts: {
    news: FALLBACK_POSTS.filter((post) => post.categories.includes(1)),
    business: FALLBACK_POSTS.filter((post) => post.categories.includes(2)),
    sport: FALLBACK_POSTS.filter((post) => post.categories.includes(3)),
    entertainment: [],
    life: [],
    health: [],
  },
  categories: FALLBACK_CATEGORIES,
};

export function getMockPostsByCategory(categoryId: number, limit = 5): Post[] {
  return FALLBACK_POSTS.filter((post) => post.categories.includes(categoryId)).slice(0, limit);
}

export function getMockPostBySlug(slug: string): Post | undefined {
  return FALLBACK_POSTS.find((post) => post.slug === slug);
}

export function getMockCategoryBySlug(slug: string): Category | undefined {
  return FALLBACK_CATEGORIES.find((category) => category.slug === slug);
}

export function getMockAuthorBySlug(slug: string): Author | undefined {
  return FALLBACK_AUTHORS.find((author) => author.slug === slug);
}
