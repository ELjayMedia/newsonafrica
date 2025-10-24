# News On Africa Architecture

This document outlines the architecture of the News On Africa application, explaining the key components, data flow, and design decisions.

## System Overview

News On Africa is a modern Next.js application that serves as a pan-African news platform. The application connects to a headless WordPress CMS for content and uses Supabase for authentication, user data storage, and real-time features.

## Architecture Diagram

\`\`\`mermaid
graph TD
    User[User] --> FE[Frontend - Next.js App]
    FE --> WPAPI[WordPress REST API]
    FE --> SupabaseAuth[Supabase Auth]
    FE --> SupabaseDB[Supabase Database]
    FE --> CDN[Vercel CDN]
    WPAPI --> WP[WordPress CMS]
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
- **REST API**: Provides content to the frontend
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
4. If not cached or stale, fetches from WordPress API
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
- **REST API**: Robust API for headless implementation

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
- **Sitemap Fetch Limits**: `/sitemap.xml` and `/server-sitemap.xml` only pull the latest 100 posts during generation; rely on cached feeds (e.g., `/api/home-feed` or native WordPress sitemaps) for deeper archives to avoid heavy GraphQL bursts during builds.

## Security Considerations

- **Authentication**: JWT-based with secure HTTP-only cookies
- **API Protection**: Rate limiting and CSRF protection
- **Database Security**: Row-level security policies
- **Content Security Policy**: Strict CSP headers
- **Input Validation**: Server-side validation for all user inputs

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
