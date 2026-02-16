# Configuration Guide

## Overview

News On Africa uses a unified, type-safe configuration system with Zod validation. All configuration is centralized in `config/index.ts`.

## Configuration Structure

\`\`\`typescript
import { config, getConfig, isFeatureEnabled } from '@/config'

// Access config values
const siteUrl = config.site.url
const defaultCountry = config.site.defaultCountry
const isCommentsEnabled = config.features.comments

// Or use helpers
const enabled = isFeatureEnabled('bookmarks')
\`\`\`

## Environment Variables

### Required

\`\`\`bash
NEXT_PUBLIC_SITE_URL=https://app.newsonafrica.com
NEXT_PUBLIC_DEFAULT_SITE=sz
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_...
\`\`\`

### Optional

\`\`\`bash
# WordPress
WORDPRESS_REQUEST_TIMEOUT_MS=30000
WORDPRESS_GRAPHQL_AUTH_HEADER={"Authorization": "Bearer token"}
WP_REST_FALLBACK=0 # server-only flag, do not prefix with NEXT_PUBLIC_

# Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Paystack
PAYSTACK_SECRET_KEY=sk_...

# Feature Flags
FEATURE_COMMENTS=true
FEATURE_BOOKMARKS=true
FEATURE_SUBSCRIPTIONS=true
FEATURE_ADVANCED_SEARCH=true

# SEO
NEXT_PUBLIC_TWITTER_HANDLE=@newsonafrica
NEXT_PUBLIC_FACEBOOK_APP_ID=123456789
\`\`\`

## Configuration Sections

### Site
- `url`: Public site URL
- `name`: Site name
- `description`: Site description
- `defaultCountry`: Default country edition (2-letter code)

### WordPress
- `baseUrl`: WordPress base URL
- `timeout`: Request timeout in ms
- `retryAttempts`: Number of retry attempts
- `retryDelay`: Delay between retries in ms
- `authHeaders`: Optional auth headers for GraphQL

> `WP_REST_FALLBACK` is read on the server runtime only (Node/SSR). Do not expose it as `NEXT_PUBLIC_*`.

### Editions
- `supported`: Array of supported country codes
- `fallbacks`: Country fallback mappings

### Content
- `postsPerPage`: Posts per page
- `relatedPostsCount`: Number of related posts
- `excerptLength`: Excerpt character limit
- `categories`: Available categories

### Features
- `comments`: Enable comments
- `bookmarks`: Enable bookmarks
- `subscriptions`: Enable subscriptions
- `advancedSearch`: Enable advanced search

### Supabase
- `url`: Supabase project URL
- `anonKey`: Supabase anon key
- `serviceRoleKey`: Supabase service role key (server-only)

### Paystack
- `publicKey`: Paystack public key
- `secretKey`: Paystack secret key (server-only)

### Performance
- `imageOptimization`: Enable image optimization
- `lazyLoading`: Enable lazy loading
- `prefetchLinks`: Enable link prefetching
- `cacheTimeout`: Cache timeout in ms

### SEO
- `defaultTitle`: Default page title
- `titleTemplate`: Title template
- `defaultDescription`: Default meta description
- `twitterHandle`: Twitter handle
- `facebookAppId`: Facebook app ID

## Validation

Configuration is validated using Zod at startup. Invalid configuration will throw an error and prevent the app from starting.

## Migration from Old Config

Old config files are deprecated:
- `config/env.ts` → Merged into `config/index.ts`
- `config/site.ts` → Merged into `config/index.ts`
- `lib/config.ts` → Merged into `config/index.ts`
- `config/paystack.ts` → Merged into `config/index.ts`

Update imports:
\`\`\`typescript
// Old
import { ENV } from '@/config/env'
import { appConfig } from '@/lib/config'

// New
import { config } from '@/config'
