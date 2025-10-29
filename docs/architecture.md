# News On Africa Architecture

This document outlines the architecture of the News On Africa application, explaining the key components, data flow, and design decisions.

## System Overview

News On Africa is a modern Next.js application that serves as a pan-African news platform. The application connects to a headless WordPress CMS for content and uses Supabase for authentication, user data storage, and real-time features.

## Architecture Diagram

\`\`\`mermaid
graph TD
    User[User] --> FE[Frontend - Next.js App]
    FE --> WPGraphQL[WordPress GraphQL API]
    FE --> SupabaseAuth[Supabase Auth]
    FE --> SupabaseDB[Supabase Database]
    FE --> CDN[Vercel CDN]
    WPGraphQL --> WP[WordPress CMS]
    SupabaseAuth --> SupabaseDB
    WP --> Webhook[Webhooks]
    Webhook --> Revalidation[Next.js Revalidation]
    Revalidation --> CDN
\`\`\`

## Key Components

### 1. Frontend (Next.js App)

The frontend is built with Next.js using the App Router, providing a fast, responsive user interface with the following features:

- **Server Components**: For improved performance and SEO
- **Client Components**: For interactive elements
- **Incremental Static Regeneration**: For efficient content updates

### 2. Content Management (WordPress)

WordPress serves as the content management system with the following setup:

- **Multisite Architecture**: Supports multiple country editions
- **GraphQL API**: Provides content to the frontend through a single schema
- **Custom Post Types**: For different content categories
- **Webhooks**: Trigger revalidation on content updates

### 3. Authentication & User Data (Supabase)

Supabase provides authentication and database services:

- **Auth Providers**: Email/password, Google, Facebook
- **PostgreSQL Database**: Stores user profiles, bookmarks, comments
- **Row-Level Security**: For data protection
- **Real-time Subscriptions**: For live updates

### 4. Content Delivery (Vercel)

Vercel serves as the hosting and CDN platform:

- **Edge Network**: Global content delivery
- **Serverless Functions**: For API routes
- **Automatic Deployments**: CI/CD pipeline
- **Preview Environments**: For testing changes

## Data Flow

### Content Retrieval Flow

1. User requests a page
2. Next.js checks if the page is in the cache
3. If cached and valid, serves from cache
4. If not cached or stale, fetches from the WordPress GraphQL API
5. Renders the page and caches the result
6. Returns the page to the user

### Authentication Flow

1. User submits login credentials
2. Frontend sends credentials to Supabase Auth
3. Supabase validates and returns JWT token
4. Frontend stores token in secure cookie
5. User profile is fetched from Supabase database
6. User state is updated in the application

### Content Update Flow

1. Editor updates content in WordPress
2. WordPress triggers webhook to Next.js API route
3. API route triggers revalidation of affected pages
4. Next.js regenerates the pages in the background
5. CDN cache is updated with new content

## Design Decisions

### Why Next.js?

- **Performance**: Server components reduce client-side JavaScript
- **SEO**: Server-side rendering improves search engine visibility
- **Developer Experience**: Strong TypeScript support and ecosystem
- **Scalability**: Efficient rendering and caching strategies

### Why WordPress as CMS?

- **Editorial Familiarity**: Well-known interface for content teams
- **Flexibility**: Extensive plugin ecosystem
- **Multisite Support**: Built-in support for multiple country editions
- **GraphQL API**: Unified schema that powers the headless implementation

### Why Supabase?

- **Authentication**: Built-in support for multiple providers
- **PostgreSQL**: Powerful, open-source database
- **Real-time**: Subscription capabilities for live features
- **Row-Level Security**: Fine-grained access control

## Performance Considerations

- **Image Optimization**: Next.js Image component for responsive images
- **Code Splitting**: Automatic code splitting for faster page loads
- **Caching Strategy**: ISR for optimal balance of freshness and performance
- **Core Web Vitals**: Optimized for LCP, FID, and CLS metrics
- **Sitemap Fetch Limits**: `/sitemap.xml` and `/server-sitemap.xml` only pull the latest 100 posts during generation; rely on cached GraphQL feeds (e.g., the aggregated data from `fetchAggregatedHome`) or native WordPress sitemaps for deeper archives to avoid heavy GraphQL bursts during builds.

## Revalidation Strategy

- **Server data boundaries**: Every server component that consumes WordPress GraphQL helpers exports an explicit `revalidate` interval (for example, the tag index page revalidates every five minutes while individual tag routes use a 60 second window). Static params are generated for the highest value routes so ISR can pick up the long tail on demand. 【F:app/tag/page.tsx†L1-L18】【F:app/tag/[slug]/page.tsx†L1-L54】
- **Tagged fetches**: `fetchWordPressGraphQL` accepts `tags` and `revalidate` hints so helper modules can scope cache invalidation to the content they load. Home, article, author, category, and tag helpers all pass through their cache tags alongside the matching ISR duration. 【F:lib/wordpress/client.ts†L1-L70】【F:lib/wordpress/posts.ts†L1-L209】【F:lib/wp-server/categories.ts†L1-L229】【F:lib/wordpress/authors.ts†L1-L154】【F:lib/wordpress/frontpage.ts†L1-L210】【F:app/[countryCode]/article/[slug]/article-data.ts†L1-L71】
- **Incremental regeneration hooks**: GraphQL helper tests assert the new metadata contract so future changes keep the `revalidate` hints intact. When content mutates, cache tags feed into the webhook and API revalidation utilities to refresh only the affected slices. 【F:lib/wordpress/comments.test.ts†L1-L147】【F:lib/wordpress/shared.test.ts†L1-L40】【F:app/[countryCode]/article/[slug]/page.test.tsx†L1-L231】【F:lib/wordpress/authors.test.ts†L1-L120】

## Security Considerations

- **Authentication & Session Management**: Supabase Auth manages user sign-in, issuing short-lived JWTs that are persisted through the `@supabase/ssr` helpers so credentials live inside HTTP-only cookies across server components and API routes.
- **Access Control**: Supabase Row Level Security policies are provisioned and verified through the migration utilities, ensuring every read/write is scoped to the authenticated user even when using service clients.
- **API & Webhook Hardening**: Internal APIs call Supabase with the active session, and external integrations such as the Paystack webhook validate provider signatures before mutating any data.
- **Platform Headers**: Global security headers (e.g., frame, MIME sniffing, and XSS protections) are applied from the Next.js configuration to reduce common browser-based attack vectors.
- **Input Validation**: Server-side actions sanitize payloads before persistence, combining application-level checks with Supabase constraints to prevent malformed content from being stored.

## Monitoring

- **Error Tracking**: Sentry integration

## Future Enhancements

- **AI-Powered Recommendations**: Personalized content suggestions
- **Push Notifications**: Browser-based push notifications
- **Content Translation**: Automated translation between languages
- **Audio Articles**: Text-to-speech functionality
- **Enhanced Offline Mode**: Better offline reading experience

## Detailed architecture notes

- [Category & listing pages](./architecture/category-pages.md)
