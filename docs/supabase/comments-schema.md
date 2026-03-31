# Comments Schema (Supabase)

This schema defines article comments, reactions, reports, and optional thread denormalization.

## Enum: `public.comment_status`

- `pending`
- `published`
- `rejected`
- `shadow_hidden`
- `deleted`

## Table: `public.comments`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `article_slug` | `text` | Article identifier for fetching comments. |
| `user_id` | `uuid` | Author user id (`auth.users.id`). |
| `parent_id` | `uuid` | Parent comment id for reply chains. |
| `body` | `text` | Comment body content. |
| `status` | `public.comment_status` | Lifecycle state (`pending` default). |
| `created_at` | `timestamptz` | Created timestamp. |
| `updated_at` | `timestamptz` | Last-updated timestamp. |
| `edited_at` | `timestamptz` | Optional edit timestamp. |
| `deleted_at` | `timestamptz` | Optional soft-delete timestamp. |
| `metadata` | `jsonb` | Extensible JSON metadata. |

### Required indexes

- `(article_slug, status, created_at DESC)`
- `(parent_id, created_at ASC)`
- `(user_id, created_at DESC)`

## Table: `public.comment_reactions`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `comment_id` | `uuid` | FK to `comments.id`. |
| `user_id` | `uuid` | FK to `auth.users.id`. |
| `reaction_type` | `text` | Reaction value (example: `like`). |
| `metadata` | `jsonb` | Optional metadata. |
| `created_at` | `timestamptz` | Created timestamp. |
| `updated_at` | `timestamptz` | Last-updated timestamp. |

Constraint:
- `UNIQUE (comment_id, user_id, reaction_type)`

## Table: `public.comment_reports`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `comment_id` | `uuid` | FK to `comments.id`. |
| `reporter_user_id` | `uuid` | Reporting user (`auth.users.id`). |
| `reason` | `text` | Required moderation reason. |
| `details` | `text` | Optional details. |
| `status` | `text` | Report workflow status (`open` default). |
| `metadata` | `jsonb` | Optional metadata. |
| `resolved_by` | `uuid` | Resolving moderator (`auth.users.id`). |
| `resolved_at` | `timestamptz` | Resolution timestamp. |
| `created_at` | `timestamptz` | Created timestamp. |
| `updated_at` | `timestamptz` | Last-updated timestamp. |

## Optional table: `public.comment_threads`

Use when deep nesting needs denormalized thread metadata.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `root_comment_id` | `uuid` | Root comment FK (`comments.id`). |
| `article_slug` | `text` | Owning article. |
| `depth` | `integer` | Thread nesting depth. |
| `comment_count` | `integer` | Cached total comments. |
| `metadata` | `jsonb` | Optional metadata. |
| `created_at` | `timestamptz` | Created timestamp. |
| `updated_at` | `timestamptz` | Last-updated timestamp. |

## Relationships

- `comments.user_id -> auth.users.id`
- `comments.parent_id -> comments.id`
- `comment_reactions.comment_id -> comments.id`
- `comment_reactions.user_id -> auth.users.id`
- `comment_reports.comment_id -> comments.id`
- `comment_reports.reporter_user_id -> auth.users.id`
- `comment_reports.resolved_by -> auth.users.id`
- `comment_threads.root_comment_id -> comments.id`
