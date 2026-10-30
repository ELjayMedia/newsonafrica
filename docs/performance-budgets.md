# Performance budgets (NOA-111)

Budgets for the News on Africa frontend, enforced by review against
`pnpm build` output and (once live traffic exists) field Core Web Vitals.
Measure lab numbers with Lighthouse on a mid-tier mobile profile (Moto G4
class, Slow 4G throttling) against a production build.

## Core Web Vitals budgets

| Metric                          | Budget   | Why                                                            |
| ------------------------------- | -------- | -------------------------------------------------------------- |
| LCP (Largest Contentful Paint)  | < 2.5 s  | Google "good" threshold; article hero image/headline is the LCP |
| CLS (Cumulative Layout Shift)   | < 0.1    | Google "good" threshold; reserve space for images/embeds/ads    |
| INP (Interaction to Next Paint) | < 200 ms | Google "good" threshold; keep client components small           |
| TTFB (server response)          | < 800 ms | Leaves headroom in the 2.5 s LCP budget for render + image      |

## JavaScript budgets

Sizes are the gzipped "First Load JS" numbers reported by `pnpm build`.

| Budget item                        | Budget   | Rationale                                             |
| ---------------------------------- | -------- | ----------------------------------------------------- |
| Shared First Load JS (all routes)  | ≤ 120 kB | Framework + Supabase client baseline; guards regressions |
| Reader-facing routes First Load JS | ≤ 150 kB | Home/article/category/search — the traffic-heavy pages |
| Account/auth routes First Load JS  | ≤ 200 kB | Logged-in tools; laxer, but still bounded              |
| Per-route page JS ("Size" column)  | ≤ 75 kB  | Catches a single route ballooning                      |

Other asset budgets: images served via `next/image` (AVIF/WebP, sized), no
single image > 200 kB on initial viewport; fonts are system-stack today
(0 kB webfont budget — adding a webfont needs sign-off against LCP).

## Current status — `pnpm build` (2026-07-03, NOA-111 branch)

Shared First Load JS: **102 kB** — within the 120 kB budget.

| Route                          | Size    | First Load JS | Budget | Status              |
| ------------------------------ | ------- | ------------- | ------ | ------------------- |
| `/` (root redirect/landing)    | 2.81 kB | 115 kB        | 150 kB | OK (infinite feed, 2026-10-30) |
| `/[countryCode]` (edition home)| 2.81 kB | 115 kB        | 150 kB | OK (infinite feed, 2026-10-30) |
| `/[countryCode]/article/[slug]`| 7.31 kB | 133 kB        | 150 kB | OK (2026-10-30)     |
| `/[countryCode]/category/[slug]`| 2.81 kB | 115 kB       | 150 kB | OK (infinite feed, 2026-10-30) |
| `/search`                      | 172 B   | 105 kB        | 150 kB | OK                  |
| `/account/bookmarks`           | 169 B   | 105 kB        | 200 kB | OK                  |
| `/account/onboarding`          | 2.67 kB | 124 kB        | 200 kB | OK                  |
| `/account/profile`             | 69.2 kB | 191 kB        | 200 kB | **Watch** (see below) |
| `/login` / `/register`         | 3.19 kB | 128 kB        | 200 kB | OK                  |

Middleware bundle: 104 kB (runs on every non-static request — keep it from
growing; it already carries the Supabase SSR client).

### Over/near budget

- **`/account/profile` — 69.2 kB route JS, 191 kB First Load.** The only
  route breaching the 75 kB per-route page-JS budget (and within 9 kB of its
  First Load ceiling). The avatar upload/crop UI dominates; candidate fix:
  `next/dynamic` the avatar editor so it loads on interaction instead of
  with the page. Everything else is comfortably inside budget.

### Mobile layout notes (NOA-111)

- The fixed bottom navigation (`components/bottom-navigation.tsx`) is a
  single small client component using core utilities only (no icon library
  — inline SVGs) so it adds no measurable JS weight to the shared bundle.
- Root layout reserves `4rem + env(safe-area-inset-bottom)` bottom padding
  on mobile so the fixed nav never overlaps content — this avoids CLS from
  late-mounting UI and keeps tap targets clear of the iOS home indicator.

## How to re-check

1. `pnpm build` — compare the route table against the budgets above.
2. `npx lighthouse <url> --preset=perf --form-factor=mobile` on a deployed
   production build for LCP/CLS/INP lab numbers.
3. Update the "Current status" table in this file when routes change
   materially (new heavy dependency, new route group).
