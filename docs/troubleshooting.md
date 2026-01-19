# Troubleshooting Guide

This guide captures the most common issues developers encounter when running News on Africa locally or in a hosted environment. Use the sections below to quickly diagnose configuration problems and recover a working build.

## GraphQL endpoint returns 404 or REST payloads

1. Verify your environment variables in Vercel (or `.env.local`) only include **valid** overrides:
   - `NEXT_PUBLIC_WP_SZ_GRAPHQL`
   - `NEXT_PUBLIC_WP_ZA_GRAPHQL`
   - `NEXT_PUBLIC_WP_NG_GRAPHQL`
   - `NEXT_PUBLIC_WP_KE_GRAPHQL`
   - `NEXT_PUBLIC_WP_TZ_GRAPHQL`
   - `NEXT_PUBLIC_WP_EG_GRAPHQL`
   - `NEXT_PUBLIC_WP_GH_GRAPHQL`
   - Additional editions must follow the pattern `NEXT_PUBLIC_WP_{COUNTRY}_GRAPHQL`.
2. Remove any malformed values. The application automatically falls back to the default endpoints when an override is missing.
3. Redeploy after cleaning the variables. Stale builds frequently cache the broken endpoint configuration.

> [!TIP]
> Every country-specific GraphQL endpoint must follow `https://newsonafrica.com/{country}/graphql`.

## GraphQL requests require authentication headers

Some WordPress environments enforce authenticated GraphQL access. When requests fail with `401 Unauthorized`:

1. Generate the required token or basic auth credentials within WordPress.
2. Set `WORDPRESS_GRAPHQL_AUTH_HEADER` in `.env.local` or the Vercel dashboard.
3. Use either a plain header value (e.g. `Bearer YOUR_TOKEN`) or a JSON map of header names to values.

## Supabase sign-in fails locally

Supabase authentication relies on valid environment variables and a running local Supabase project.

1. Install the Supabase CLI and authenticate: `supabase login`.
2. Reset the local database from migrations: `supabase db reset --no-backup`.
3. Ensure the following keys exist in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Validate the schema matches the latest migrations:
   - `bookmarks` and `comments` should expose `wp_post_id` + `edition_code` columns.
   - The tables `bookmark_collections`, `bookmark_user_counters`, and `comment_reactions` must exist with RLS enabled. Inspect them via `supabase db inspect --schema public --table <table>`.
   - Run `psql "$SUPABASE_DB_URL" -c "\dRp+ public.bookmark_collections"` to confirm owner-only policies are active.

## Cache revalidation does not refresh content

The `/api/revalidate` endpoint accepts parameters that control which cache tags are invalidated.

1. For a full content sweep, call `/api/revalidate?secret=...&type=content`.
2. To target specific taxonomy pages, provide additional parameters:
   - `tagSlug=<slug>&country=<edition>` for tag pages.
   - `categorySlug=<slug>` for category hubs.
   - Repeated `section` parameters (e.g. `section=frontpage&section=hero`) for custom cache tags.
3. Confirm the calling integration sets the `WORDPRESS_WEBHOOK_SECRET` that matches your environment.

## Development server fails to start

Double-check local dependencies and Node.js version.

1. Use Node.js 18 or newer.
2. Install dependencies with `pnpm install`. Mixing package managers can corrupt the lockfile.
3. Clear the `.next` directory if build artifacts linger from a different Node.js version.
4. Run the server with `pnpm dev` and inspect the terminal output for missing environment variables.

## Need more help?

If the above steps do not resolve your issue, open a discussion in the engineering channel with:

- Your current Git commit hash
- Operating system and Node.js version
- Logs from the failing command
- A snapshot of your `.env.local` (omit secrets)

This context ensures reviewers can reproduce the problem quickly.
