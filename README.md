# News On Africa

A modern Next.js application for delivering news content across Africa with a focus on performance and user engagement.

## ⚠️ Quick Fix: GraphQL Endpoint Issues

**If you're seeing 404 errors or "GraphQL endpoint appears to be REST API" warnings:**

Your WordPress GraphQL environment variables may be misconfigured. Each edition supports overrides such as `NEXT_PUBLIC_WP_SZ_GRAPHQL`.

**Quick Solution:** Delete any malformed GraphQL variables from your Vercel Environment Variables and redeploy. The app will use correct defaults automatically.

See [Troubleshooting Guide](./docs/troubleshooting.md) for detailed solutions.

## 🌟 Features

- **Mobile-first, responsive design**: Optimized for all devices with a focus on mobile experience
- **Fast loading times**: Optimized assets and code splitting for performance
- **Authentication**: Multi-provider auth with email, Google, and Facebook
- **Personalization**: User profiles, bookmarks, and preferences
- **Ad integration**: Flexible ad placement system for monetization
- **Supabase-powered search**: Fast full-text search with Postgres FTS, no external dependencies
- **Multi-site architecture**: Support for country-specific editions

## 🏗️ Architecture

### Frontend Architecture

The application follows a feature-based architecture with the following structure:

\`\`\`
news-on-africa/
├── app/                  # Next.js App Router pages and layouts
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── category/         # Category pages
│   ├── post/             # Post pages
│   └── ...               # Other page routes
├── components/           # Shared React components
│   ├── ui/               # UI components (buttons, inputs, etc.)
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── contexts/             # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── services/             # API service modules
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
\`\`\`

> [!NOTE]
> Authentication server actions are centralized in [`app/actions/auth`](./app/actions/auth) to replace the removed `services/auth-service.ts` helpers.

### Data Flow

1. **Content Source**: WordPress CMS with WPGraphQL
2. **Authentication**: Supabase Auth with JWT tokens
3. **Data Storage**: Supabase PostgreSQL for user data
4. **Caching**: Next.js ISR (Incremental Static Regeneration)
5. **CDN**: Vercel Edge Network

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- WordPress instance with WPGraphQL enabled

### Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
# --- App Configuration ---
NEXT_PUBLIC_DEFAULT_SITE=sz
NEXT_PUBLIC_SITE_URL=http://app.newsonafrica.com
# The staging domain is now the default development origin

# --- WordPress Endpoints ---
# Country-specific GraphQL endpoints (for multi-site)
NEXT_PUBLIC_WP_SZ_GRAPHQL=https://newsonafrica.com/sz/graphql
NEXT_PUBLIC_WP_ZA_GRAPHQL=https://newsonafrica.com/za/graphql

# --- WordPress Authentication (Optional) ---
# Provide credentials for build-time/server-side GraphQL requests.
# Supports either a plain Authorization value or a JSON object of headers.
# Examples:
# WORDPRESS_GRAPHQL_AUTH_HEADER=Bearer your-token
# WORDPRESS_GRAPHQL_AUTH_HEADER={"Authorization":"Basic base64","X-Role":"editor"}
WORDPRESS_GRAPHQL_AUTH_HEADER=

# --- Supabase Configuration ---
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# --- Paystack Configuration ---
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# --- Security & Webhooks ---
REVALIDATION_SECRET=your_random_revalidation_secret
WORDPRESS_WEBHOOK_SECRET=your_wordpress_webhook_secret

# --- Social Integration (Optional) ---
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id

# --- Feature Flags (Optional) ---
FEATURE_COMMENTS=true
FEATURE_BOOKMARKS=true
FEATURE_SUBSCRIPTIONS=true
FEATURE_ADVANCED_SEARCH=true
\`\`\`

> [!TIP]
> Set `WORDPRESS_GRAPHQL_AUTH_HEADER` when your WordPress instance requires authenticated GraphQL access. Provide either the raw
> `Authorization` value (e.g. `Bearer <token>`) or a JSON object mapping header names to values for multi-header setups.

### Installation

> [!NOTE]
> The repository standardizes on **pnpm** for dependency management. Install dependencies with `pnpm install` and keep `pnpm-lock.yaml` committed.

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/news-on-africa.git
cd news-on-africa

# Install dependencies
pnpm install

# Run the development server
pnpm dev
\`\`\`


### Database setup

Supabase schema changes are managed exclusively through the Supabase CLI migrations in [`supabase/migrations`](./supabase/migrations).

\`\`\`bash
# Apply the latest migrations to your local database
supabase db reset --no-backup

# Or push migrations to a linked remote project
supabase db push
\`\`\`

After applying migrations, confirm the latest schema landed. The current release expects:

1. `comments` and `bookmarks` store `wp_post_id` + `edition_code` (no remaining `post_id`/`country` columns) and default to the `comment_status` + `bookmark_read_state` enums.
2. Bookmark organization data lives in `bookmark_collections` and the aggregate counts in `bookmark_user_counters`. Both tables enforce owner-only RLS policies while permitting the service role to backfill counters.
3. Comment reactions are written to `comment_reactions` using the `comment_reaction_type` enum, and the trigger `update_comment_reaction_count_trigger` keeps `comments.reactions_count` in sync.

You can double-check these expectations with the Supabase inspector:

\`\`\`bash
# Inspect the bookmark-related tables
supabase db inspect --schema public --table bookmark_collections
supabase db inspect --schema public --table bookmark_user_counters

# Confirm the reactions table and trigger exist
supabase db inspect --schema public --table comment_reactions
psql "$SUPABASE_DB_URL" -c "\d+ public.comment_reactions" -c "\d public.comments" | grep reactions_count
\`\`\`

> [!IMPORTANT]
> Legacy helper scripts that lived in `lib/supabase/sql` have been removed. Always edit or add new SQL through the CLI migration files so the schema stays in sync across every environment.

## 🧰 Cache Revalidation API

Editorial tooling that calls `/api/revalidate` can target both broad content sweeps and specific tag-driven caches.

- The `type=content` run now refreshes the following cache tags: `posts`, `categories`, `featured`, `trending`, and the newly
  added `tags` bucket. This keeps dynamic tag feeds aligned with ISR refreshes.
- Targeted revalidation supports additional query parameters:
  - `tagSlug` + optional `country` (defaults to the primary site edition) invalidates the `country:{code}`, `section:tags`, and
    `tag:{slug}` cache tags produced by WordPress fetch helpers.
  - `categorySlug` generates `section:categories` + `category:{slug}` cache tags for manual category refreshes.
  - Repeating `section` parameters allows power users to pass custom cache sections (e.g. `section=frontpage`) which the API
    maps through the cache tag builder.

Update newsroom automation or webhook integrations to include these parameters where appropriate so manual revalidation stays in
sync with ISR intervals.

**Important:** For WordPress endpoints, ensure every country override (e.g. `NEXT_PUBLIC_WP_SZ_GRAPHQL`) follows the correct format with the country slug:
- GraphQL: `https://newsonafrica.com/{country}/graphql`

The application now communicates with WordPress exclusively through GraphQL, so REST fallbacks and application credentials are no longer required.

## 🔍 Search

The search system uses **Supabase PostgreSQL Full-Text Search (FTS)** instead of external search services. This provides:

- ✅ Fast search across all editions (SZ, ZA, NG, ZM)
- ✅ Works reliably with low bandwidth
- ✅ Typeahead suggestions with edge caching
- ✅ No external dependencies (Algolia-free)
- ✅ Simple infrastructure

### Search Architecture

**Content Index:** Posts are synced to a `content_index` table in Supabase with PostgreSQL `tsvector` columns for full-text search.

**Real-time Sync:** WordPress webhooks automatically update the search index when posts are published/updated.

**Search API:**
- `/api/search` - Main search with ranking, pagination, and filters
- `/api/search/suggest` - Fast typeahead suggestions (edge-cached)

### Backfilling Search Data

After deploying or to repair sync issues:

\`\`\`bash
# Sync all countries
pnpm backfill-search

# Sync specific country with limit
pnpm backfill-search -- --country=sz --limit=500

# Sync with pagination
pnpm backfill-search -- --country=za --limit=100 --offset=200
\`\`\`

See [Search Migration Guide](./docs/SEARCH_MIGRATION.md) for detailed architecture and troubleshooting.

## 📦 Deployment

The application is deployed on Vercel with the following configuration:

1. **Build Command**: `pnpm build`
2. **Output Directory**: `.next`
3. **Environment Variables**: Set all required variables in Vercel dashboard

## 🧪 Testing

\`\`\`bash
# Run unit tests
pnpm test

# Run end-to-end tests
pnpm test:e2e

# Run linting
pnpm lint
\`\`\`

## 📚 Documentation

Additional documentation:

- [Troubleshooting Guide](./docs/troubleshooting.md) ⭐ **Start here for common issues**, including GraphQL configuration, Supabase tips, and cache revalidation workflows.
- [Component Documentation](./docs/components.md) explains how UI, layout, and feature components are organized and how to extend them safely.
