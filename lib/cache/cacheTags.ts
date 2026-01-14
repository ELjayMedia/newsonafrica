export const cacheTags = {
  // Home page tags
  home: (edition: string) => `home:${edition.toLowerCase()}`,
  homeFeed: () => "section:home-feed",

  // Post tags
  post: (country: string, postId: number) => `post:${country.toLowerCase()}:${postId}`,
  postSlug: (country: string, slug: string) => `post-slug:${country.toLowerCase()}:${slug}`,

  // Category tags
  category: (country: string, slug: string) => `category:${country.toLowerCase()}:${slug}`,

  // Author tags
  author: (country: string, slug: string) => `author:${country.toLowerCase()}:${slug}`,

  // Tag page tags
  tag: (country: string, slug: string) => `tag:${country.toLowerCase()}:${slug}`,

  // Edition-wide tags
  edition: (country: string) => `edition:${country.toLowerCase()}`,

  // Country-wide tags
  country: (country: string) => `country:${country.toLowerCase()}`,
} as const
