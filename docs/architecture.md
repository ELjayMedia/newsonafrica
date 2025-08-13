# Architecture & Contribution Guide

This document describes how News on Africa is structured and how to extend it.

## Feature‑first layout and code organization

The repository is organized by feature. Every unit of functionality lives in `src/features/<name>` alongside its UI components, server actions, and tests. Route definitions live in the top‑level `app/` directory and import these feature modules. Shared UI elements stay in `src/components`, utilities and data fetching helpers in `src/lib`, and server‑only files, like middleware, in `src/server`.

## RSC + cache tags strategy

We rely on React Server Components and the Next.js caching layer. The `jfetch` helper wraps `fetch` and sets a `revalidate` interval and cache `tags` on every request. Tag generators in `src/lib/cache/revalidate.ts` produce consistent tag names for articles and lists, and `bust.byTag` calls `revalidateTag` to invalidate caches. WordPress webhooks trigger the `revalidateTags` function so updated content is served immediately.

## Country resolution via middleware

Incoming requests pass through `src/server/middleware.ts`. The middleware uses `resolveCountry` to extract the country from the URL path or subdomain, then stores the result in the `x-noa-country` response header. If no country is found, `sz` (Eswatini) is used. Features can read this header to tailor data fetches and UI.

## Adding a new feature

1. Create `src/features/<name>` and scaffold any components, server actions, and tests inside it.
2. Export any public components or helpers from an `index.ts` file.
3. Use the new feature in pages under `app/` or other features.
4. Keep feature code isolated; move shared logic to `src/lib` or `src/components`.

## Fetching WordPress data and when to use Supabase server actions

Content is fetched from the WordPress REST API using the `wp` client (`src/lib/wp-client/rest.ts`). Calls like `wp.list` and `wp.article` run in server components or server actions and use `jfetch` so cache tags are applied automatically.

Use Supabase server actions for authenticated reads or mutations—saving bookmarks, managing profiles, etc. Implement a `'use server'` function within a feature, create a Supabase client with `createSupabaseServer` (`src/lib/supabase/server.ts`), perform the database work, and optionally revalidate related cache tags to update cached pages.
