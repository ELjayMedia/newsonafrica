import { getWpEndpoints } from "@/config/wp"
import { env } from "@/config/env"

const { rest: WORDPRESS_REST_API_URL } = getWpEndpoints()

export const siteConfig = {
  name: "News On Africa",
  description: "Your premier source for African news, politics, business, and culture",
  url: env.NEXT_PUBLIC_SITE_URL,
  ogImage: "/news-on-africa-logo.png",
  links: {
    twitter: "https://twitter.com/newsonafrica",
    facebook: "https://facebook.com/newsonafrica",
    instagram: "https://instagram.com/newsonafrica",
  },
  author: {
    name: "News On Africa",
    url: "https://app.newsonafrica.com",
  },
  keywords: [
    "Africa news",
    "African politics",
    "African business",
    "African culture",
    "African sports",
    "African entertainment",
    "African technology",
    "African economy",
  ],
  categories: [
    { name: "News", slug: "news", description: "Latest news from across Africa" },
    { name: "Politics", slug: "politics", description: "Political developments and analysis" },
    { name: "Business", slug: "business", description: "Business news and economic insights" },
    { name: "Sports", slug: "sports", description: "Sports news and updates" },
    { name: "Entertainment", slug: "entertainment", description: "Entertainment and cultural news" },
    { name: "Technology", slug: "technology", description: "Technology and innovation news" },
    { name: "Health", slug: "health", description: "Health and wellness news" },
    { name: "Education", slug: "education", description: "Education news and insights" },
  ],
  // WordPress API configuration
  wordpress: {
    apiUrl: WORDPRESS_REST_API_URL,
    authToken: env.WORDPRESS_AUTH_TOKEN,
    username: env.WP_APP_USERNAME,
    password: env.WP_APP_PASSWORD,
    timeout: 10000,
    retries: 3,
    fallbackEnabled: true,
  },
  // Search configuration
  search: {
    enabled: true,
    placeholder: "Search articles, news, and more...",
    suggestionsEnabled: true,
    maxSuggestions: 8,
    debounceMs: 250,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    provider: "wordpress", // Using WordPress for search
  },
  // Social sharing
  social: {
    enableSharing: true,
    platforms: ["twitter", "facebook", "whatsapp", "email"],
  },
  // Comments
  comments: {
    enabled: true,
    provider: "supabase", // Using Supabase for comments
  },
  // Newsletter
  newsletter: {
    enabled: true,
    provider: "mailchimp", // or "convertkit", "emailoctopus"
  },
  performance: {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    enableOfflineMode: true,
    enableServiceWorker: true,
  },
  features: {
    comments: env.NEXT_PUBLIC_APP_ENV !== "development",
    bookmarks: true,
    subscriptions: env.NEXT_PUBLIC_APP_ENV !== "development",
    advancedSearch: true,
    socialSharing: true,
    newsletter: true,
  },
}

export type SiteConfig = typeof siteConfig
