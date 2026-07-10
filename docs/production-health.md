# Production health checklist (NOA-28)

The minimum recurring checks to confirm News on Africa is healthy in production.
Most checks are a dashboard glance or a one-line query; the content-index report
and per-edition sync status have dedicated tooling (below).

## At a glance

| Surface                      | Where to check                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Deployment                   | Vercel dashboard → project `newsonafrica` → Deployments (latest `main` = **Ready**) |
| Content sync / search        | `/account/admin/content-sync` (admin UI) or `GET /api/admin/content-sync/status`    |
| Content-index depth/coverage | "Content-index health report" query in [deployment.md](./deployment.md) §4          |
| Supabase project + advisors  | Supabase dashboard, or MCP `get_project` / `get_advisors`                           |
| Reader interaction           | the SQL in §5 below                                                                 |

## 1. Deployment

- Latest production deployment on `main` is **Ready** (no failed prod deploy).
- `app.newsonafrica.com` returns HTTP 200; project `live` flag is `true` (pre-launch gate — see NOA-121).
- Latest `main` CI is green.

## 2. Public route smoke check

After every production deploy, confirm these return a real page (no blank
screen / runtime error, mobile layout intact): `/`, `/sz`, one known article
(`/sz/article/<slug>`), `/search?q=eswatini`, `/login`, `/account/bookmarks`,
`/manifest.webmanifest`, `/sitemap.xml`.

## 3. Supabase health

- Project status `ACTIVE_HEALTHY`.
- Auth sign-in works; a smoke account can read/update its profile and write a
  bookmark/comment.
- **Security advisors** (`get_advisors` → security) triaged. Current findings
  (2026-07-10) to resolve before/around launch:
  - **Leaked-password protection disabled** — enable in Dashboard → Authentication → Password security ([docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
  - **`sync_comment_post_counters()` is a `SECURITY DEFINER` function executable by `anon`/`authenticated`** via `/rest/v1/rpc/...` — revoke `EXECUTE` or switch to `SECURITY INVOKER` (it's an internal trigger fn, not a public RPC).
  - **`most_read_content` has a mutable `search_path`** — pin `search_path` (as the other RPCs do).

## 4. Content sync & search

Per edition (`sz`, `za`, `ng`) — from `/account/admin/content-sync` or the
report query in [deployment.md](./deployment.md) §4:

- `content_index` row count is non-zero and matches expectations.
- `content_sync_cursor.sync_status` is `completed`/`idle`, `error_message` null,
  `last_synced_at` within the sync cadence (~25h).
- `search_vector` coverage is 100% (`missing_vector = 0`).
- A live search returns real content routing to valid article pages.

## 5. Reader interaction

```sql
select
  (select count(*) from auth.users)                                                  as users,
  (select count(*) from auth.users where created_at >= now() - interval '7 days')    as users_7d,
  (select count(*) from public.profiles)                                             as profiles,
  (select count(*) from public.bookmarks)                                            as bookmarks,
  (select count(*) from public.bookmarks where created_at >= now() - interval '7 days') as bookmarks_7d,
  (select count(*) from public.comments)                                             as comments,
  (select count(*) from public.comments where created_at >= now() - interval '7 days')  as comments_7d,
  (select count(*) from public.comments where status in ('flagged','pending'))       as comments_needing_review;
```

Healthy signal: `profiles` tracks `users` (the profile trigger fires), and
interaction counts trend up once live. `comments_needing_review` is the
moderation backlog (see `/account/admin/comments`).

## 6. Security posture

- `SUPABASE_SERVICE_ROLE_KEY` never in a client bundle; only the anon key is
  client-side.
- Vercel env vars match [deployment.md](./deployment.md) §3.
- No WordPress admin/API credentials in public code.

## Reporting rhythm

- **Pre-launch:** weekly (suggest Monday 09:00 SAST).
- **Launch week:** daily for the first 7 days.
- **After every production deploy:** the §2 route smoke check + a §4 sync/search check.

Record results in a shared tracking doc. If this becomes repetitive, a scheduled
job (Vercel Cron / GitHub Action) could post the §4 report + §5 counts + advisor
status to Slack — worth a follow-up automation ticket.

## Baseline snapshot — 2026-07-10 (pre-launch)

| Metric                       | Value                    |
| ---------------------------- | ------------------------ |
| Supabase project             | `ACTIVE_HEALTHY`         |
| auth users / profiles        | 2 / 2 (trigger healthy)  |
| new users (7d)               | 0                        |
| bookmarks / comments         | 0 / 0 (pre-launch)       |
| `content_index` rows         | 818 (sz 814, za 3, ng 1) |
| sync problems (failed/stuck) | 0                        |
| security advisors (WARN)     | 4 — see §3               |

Interpretation: infrastructure healthy and search is populated/functional;
reader-interaction metrics are zero pre-launch (expected). The open items are
the four security-advisor warnings in §3 and the sparse `za`/`ng` editions
(NOA-29 / NOA-121).
