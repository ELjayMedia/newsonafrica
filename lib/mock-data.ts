// Minimal fallback data for offline scenarios
export const FALLBACK_POSTS = [
  {
    id: "fallback-1",
    title: "Offline Content",
    excerpt: "This content is displayed when you're offline. Please reconnect to the internet for the latest news.",
    slug: "offline-content",
    date: new Date().toISOString(),
    featuredImage: {
      node: {
        sourceUrl: "/offline-sign.png",
        altText: "Offline indicator",
      },
    },
    categories: {
      nodes: [
        {
          name: "News",
          slug: "news",
        },
      ],
    },
    author: {
      node: {
        name: "News On Africa",
      },
    },
  },
]

// Fallback homepage data structure
export const mockHomepageData = {
  featuredPosts: FALLBACK_POSTS,
  categories: [
    {
      name: "News",
      slug: "news",
      posts: {
        nodes: FALLBACK_POSTS,
      },
    },
  ],
  taggedPosts: FALLBACK_POSTS,
  recentPosts: FALLBACK_POSTS,
}
