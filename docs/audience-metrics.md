# Audience engagement metrics (NOA-30)

The reader-engagement metrics News on Africa can report **today**, defined
against the live Supabase schema, plus the instrumentation gaps that block the
rest. This is the definition of "what we measure and how"; the recurring
health/interaction snapshot lives in [production-health.md](./production-health.md) §5.

> **Schema note.** Earlier NOA-30 planning (June 2026) assumed a pre-rebuild
> schema — `comments.article_slug`, a `search_query_log` table,
> `bookmark_user_counters`, `subscriptions`, page-view analytics. The current
> rebuild has none of those. The definitions below are written against what is
> actually deployed (verified 2026-07-10) so they can be run without further
> schema work. Everything that still needs instrumentation is called out in
> [§5](#5-not-yet-measurable-instrumentation-gaps).

## What we can measure today

All engagement data is first-party in Supabase (`auth.users`, `public.profiles`,
`public.bookmarks`, `public.comments`, `public.content_index`). The cross-system
join key is `(edition_code, wp_post_id)`. There is **no** third-party analytics
provider and **no** page-view/session tracking, so every metric below is a
registered-reader action, not anonymous traffic.

### 1. Audience base

| Metric | Definition | Source |
| ------ | ---------- | ------ |
| Registered readers | `count(*)` in `auth.users` | `auth.users` |
| New readers (7d/30d) | `auth.users` where `created_at >= now() - interval '7 days'` | `auth.users` |
| Completed profiles | `profiles` where `onboarded = true` | `public.profiles` |
| Profile completeness | share of profiles with `full_name`, `country`, and ≥1 `interests` | `public.profiles` |
| Audience by country | `count(*)` grouped by `profiles.country` | `public.profiles` |
| Declared interests | unnest of `profiles.interests`, ranked by frequency | `public.profiles` |

```sql
-- Audience base + onboarding funnel
select
  (select count(*) from auth.users)                                             as registered,
  (select count(*) from auth.users where created_at >= now() - interval '30 days') as new_30d,
  (select count(*) from public.profiles where onboarded)                        as onboarded,
  (select count(*) from public.profiles
     where full_name is not null and country is not null
       and coalesce(array_length(interests, 1), 0) > 0)                         as profile_complete;

-- Top declared interests (drives editorial/segmentation)
select interest, count(*) as readers
from public.profiles, unnest(interests) as interest
group by interest order by readers desc limit 20;
```

### 2. Bookmarking / save behaviour

`bookmarks` carries a read lifecycle (`read_state`: `unread` / `in_progress` /
`read`), optional `collection_id`, and a content snapshot (`title`, `slug`,
`category`, `tags`), so we can report both *volume* and *follow-through*.

| Metric | Definition | Source |
| ------ | ---------- | ------ |
| Total saves | `count(*)` in `bookmarks` | `public.bookmarks` |
| Savers | `count(distinct user_id)` | `public.bookmarks` |
| Saves per saver | total saves / savers | `public.bookmarks` |
| Read-through rate | share of bookmarks with `read_state = 'read'` | `public.bookmarks` |
| Saves by edition | group by `edition_code` | `public.bookmarks` |
| Most-saved articles | group by `(edition_code, wp_post_id)`, join `content_index` for title | `bookmarks` + `content_index` |
| Most-saved categories | group by `category` (snapshot) | `public.bookmarks` |

```sql
-- Save behaviour + read-through
select
  count(*)                                                       as saves,
  count(distinct user_id)                                        as savers,
  round(count(*)::numeric / nullif(count(distinct user_id), 0), 2) as saves_per_saver,
  round(100.0 * count(*) filter (where read_state = 'read') / nullif(count(*), 0), 1) as read_through_pct
from public.bookmarks;

-- Most-saved articles (top content signal)
select b.edition_code, b.wp_post_id, coalesce(c.title, b.title) as title, count(*) as saves
from public.bookmarks b
left join public.content_index c using (edition_code, wp_post_id)
group by b.edition_code, b.wp_post_id, coalesce(c.title, b.title)
order by saves desc limit 20;
```

### 3. Commenting / discussion

`comments` keys by `(edition_code, wp_post_id)`, threads via `parent_id`, tracks
a 7-value `status` enum (`active`, `approved`, `pending`, `flagged`, `hidden`,
`spam`, `deleted`) and moderation columns (`reported_by`, `report_reason`,
`reviewed_at`). Engagement and moderation load both come from this table.

| Metric | Definition | Source |
| ------ | ---------- | ------ |
| Total comments | `count(*)` where `status` is reader-visible (`active`/`approved`) | `public.comments` |
| Commenters | `count(distinct user_id)` | `public.comments` |
| Reply rate | share of comments with `parent_id is not null` | `public.comments` |
| Most-discussed articles | group by `(edition_code, wp_post_id)` | `comments` + `content_index` |
| Reactions received | `sum(reactions_count)` | `public.comments` |
| Moderation backlog | `count(*)` where `status in ('flagged','pending')` | `public.comments` |
| Report rate | comments with `reported_by is not null` / total | `public.comments` |

```sql
-- Discussion volume + moderation health
select
  count(*) filter (where status in ('active','approved'))  as visible_comments,
  count(distinct user_id)                                  as commenters,
  round(100.0 * count(*) filter (where parent_id is not null) / nullif(count(*),0), 1) as reply_pct,
  sum(reactions_count)                                     as reactions,
  count(*) filter (where status in ('flagged','pending'))  as needs_review
from public.comments;

-- Most-discussed articles
select c.edition_code, c.wp_post_id, ci.title, count(*) as comments
from public.comments c
left join public.content_index ci using (edition_code, wp_post_id)
where c.status in ('active','approved')
group by c.edition_code, c.wp_post_id, ci.title
order by comments desc limit 20;
```

### 4. Content coverage (denominator)

Engagement is only meaningful against the volume of content available to engage
with. `content_index` is the searchable corpus per edition.

| Metric | Definition | Source |
| ------ | ---------- | ------ |
| Indexed articles | `count(*)` grouped by `edition_code` | `public.content_index` |
| Category breadth | distinct `categories` per edition | `public.content_index` |
| Freshness | `max(published_at)` per edition | `public.content_index` |
| Engagement coverage | share of indexed articles with ≥1 bookmark or comment | join |

```sql
-- What share of the corpus draws any engagement?
select ci.edition_code,
  count(*)                                                             as articles,
  count(*) filter (where b.wp_post_id is not null or cm.wp_post_id is not null) as with_engagement
from public.content_index ci
left join (select distinct edition_code, wp_post_id from public.bookmarks) b using (edition_code, wp_post_id)
left join (select distinct edition_code, wp_post_id from public.comments)  cm using (edition_code, wp_post_id)
group by ci.edition_code order by articles desc;
```

## Headline KPIs (report these first)

A small, stable set for the launch scorecard — everything else is drill-down:

1. **Registered readers** and **new readers (30d)** — audience growth.
2. **Onboarding completion** (`onboarded` %) — activation.
3. **Active savers + saves per saver** — habitual engagement.
4. **Read-through rate** (`read_state = 'read'`) — save quality.
5. **Visible comments + commenters** — community depth.
6. **Moderation backlog** (`flagged`/`pending`) — operational health.
7. **Engagement coverage** — how much of the corpus resonates.

## 5. Not yet measurable (instrumentation gaps)

These are the metrics the June plan named that the current stack **cannot**
produce. Each is a follow-up, not a definition we can fill in today:

| Wanted metric | Why it's blocked | Follow-up |
| ------------- | ---------------- | --------- |
| Page views, sessions, unique visitors, bounce, time-on-page | No analytics provider (`@vercel/analytics` not installed) and no server-side view logging; `app_write_events` is empty | Add a privacy-respecting analytics provider or a lightweight `page_views` capture, then define traffic KPIs |
| Article view counts / most-read by traffic | `content_index` has no `view_count`; "most read" today is bookmark/comment-derived, not impressions | Same as above; `most_read_content` can switch to real views once captured |
| Search analytics (top queries, zero-result rate, query→click) | No `search_query_log`; search runs server-side without logging terms | Log queries (term, edition, result count, clicked slug) to a new table, then define search KPIs |
| Subscriber / newsletter / commercial engagement | No `subscriptions` table and no sponsor/ad event logging in this rebuild | Depends on NOA-27 (commercial/disclosure) landing a data model first |
| Session/return frequency, DAU/WAU/MAU | Requires per-session or per-visit events, which we don't capture | Blocked on the analytics decision above |

**Recommendation:** the highest-leverage single addition is **search query
logging** — it's self-contained (one table + a write in the search path),
directly informs editorial, and unlocks a whole KPI family. Page-view analytics
is the larger decision (provider choice, privacy posture) and should be its own
ticket.

## Reporting cadence & baseline

- Produce this alongside the [production-health](./production-health.md) snapshot:
  weekly pre-launch, daily in launch week.
- Record results in the shared tracking doc; if it becomes routine, fold these
  queries into the same scheduled job proposed in production-health.md.

**Baseline — 2026-07-10 (pre-launch):** registered readers 2 / profiles 2 /
bookmarks 0 / comments 0 / indexed articles 818 (sz 814, za 3, ng 1). All
engagement metrics are expected to read zero until launch; this doc's value is
that the queries are ready to run the moment readers arrive.
