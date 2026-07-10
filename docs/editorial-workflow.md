# Editorial workflow: publishing, updates & corrections (NOA-24)

How a News on Africa story moves from draft to published, how it is updated or
corrected afterwards, and what each step means for the headless stack
(ISR/cache/search). Content is authored in **WordPress** (per-edition multisite:
`sz` / `za` / `ng`) and read by the **Next.js** front-end via the DAL and the
Supabase content index — so an editorial action has a technical tail. See
[caching-strategy.md](./caching-strategy.md) and [data-flow.md](./data-flow.md)
for the mechanics referenced here.

> **Scope of this doc.** It documents the *recommended* workflow and the system
> behaviour that supports it. A few points are genuine newsroom-policy calls
> (marked **Editorial decision**) that the editor owns; the technical work
> needed to support the recommended answers is captured in
> [§6 Follow-ups](#6-technical-follow-ups).

## 1. Roles

| Role | Responsibility |
| ---- | -------------- |
| **Author / reporter** | Drafts the article, adds category, tags, featured image, excerpt; submits for review. |
| **Editor** | Reviews, edits, sets the canonical metadata, and publishes. Owns corrections policy. |
| **Publisher/duty editor** | Handles urgent/breaking updates out of hours; can publish directly. |

One WordPress site per edition; a story published on `sz` is independent of `za`
and `ng` (term IDs and post IDs are edition-specific — this is why the webhook
and cache tags are always edition-scoped).

## 2. Draft → publish

1. **Draft.** Author creates the post, fills in **required metadata** (see §5):
   title, category (exactly one primary — the first category drives the
   breadcrumb, section, and related-articles logic), tags, featured image (with
   alt text), excerpt, and byline/author.
2. **Review.** Editor uses WordPress statuses (`Draft` → `Pending Review`) to
   move it along. Only editors publish.
3. **Publish.** Setting the post to `Published`:
   - Fires the WordPress `save_post` hook → `POST /api/webhooks/wordpress`
     (`action: "post_published"`, with `country` = edition).
   - The webhook **revalidates** the affected cache tags (`home`, `posts`, the
     post, its category/tag/author) so the story appears on the front-end within
     seconds, and **syncs** the article into Supabase `content_index` so it is
     immediately searchable and eligible for "most read".
   - Time-based `revalidate` (60s feeds / 300s taxonomy) is the safety net if a
     webhook is ever missed.

**What the reader gets:** a prerendered article page (ISR) with `NewsArticle` +
`BreadcrumbList` structured data, canonical URL, and OpenGraph/Twitter cards
(the branded OG image is generated per article).

## 3. Updates & corrections (after publish)

Editing a published post in WordPress and re-saving fires the same webhook with
`action: "post_updated"`. Technically this is seamless: the same tags are
revalidated and the `content_index` row is re-synced, so the updated title,
body, image, or taxonomy propagates within seconds. **No manual cache flush or
re-deploy is needed.**

The distinction that matters is **editorial, not technical** — how transparent
the change is to the reader:

| Change type | What to do | Reader-visible note? |
| ----------- | ---------- | -------------------- |
| **Typo / formatting / non-substantive** | Edit in place. | No. |
| **Substantive update** (new development on a running story) | Edit in place; consider an "Updated" line or an *Update:* paragraph at the top. | Recommended. |
| **Correction** (fixing a factual error) | Edit in place **and** append a dated correction note. | **Yes — required** (see below). |

**Editorial decision — corrections transparency.** Newsroom best practice
(and reader trust) is that factual corrections carry a **visible, dated
correction note** on the article ("Correction, 10 July 2026: an earlier version
stated…"). The recommended policy is:

- **Corrections and clarifications** get a visible dated note appended to the
  article body (or a dedicated corrections block — see §6).
- **Substantive updates** to a developing story get a visible "Updated" line.
- **Minor fixes** need no note.

The system already records the machine-readable side of this: every update sets
`modifiedTime` (OpenGraph) and `dateModified` (`NewsArticle` JSON-LD) from the
post's `updatedAt`, so search engines and aggregators see the revision even
before we render it visibly. The **human-visible** correction note is currently
authored inside the article body; a structured correction component is a
proposed follow-up (§6).

## 4. Urgent / breaking updates

For breaking news the priority is speed with a clear audit trail:

1. Publish a short, accurate first version (duty editor may publish directly).
2. Update the **same** post as the story develops — do **not** create duplicate
   articles for the same event (duplicates fragment search, most-read, bookmarks
   and comments, which all key on `(edition_code, wp_post_id)`).
3. Each save re-runs revalidation + content-index sync automatically, so
   readers, search, and the home rail stay current without manual steps.
4. For developing stories, lead with an "Updated" timestamp so readers can see
   the story is live and evolving.

If a story must be **pulled**, deleting/unpublishing in WordPress fires
`action: "post_deleted"` → the post is removed from `content_index` and its tags
revalidated, so it drops out of search and feeds. (Unpublish rather than hard-
delete when the URL may have been shared, so it can 404/redirect cleanly.)

## 5. Article-page metadata

What currently renders on an article page (`app/[countryCode]/article/[slug]`):

| Metadata | Source | Where it shows |
| -------- | ------ | -------------- |
| Title | `post.title` | H1 + `<title>` + OG/Twitter |
| Primary category | `post.categories[0]` | Badge + breadcrumb + JSON-LD `section` |
| Author | `post.author` | Byline (name links to author page) + JSON-LD author |
| **Published date** | `post.publishedAt` | Visible `<time>` in the header + JSON-LD `datePublished` |
| **Updated date** | `post.updatedAt` | JSON-LD `dateModified` + OG `modifiedTime` **only — not visible** |
| Featured image | `post.featuredImage` (url + alt) | Hero image + OG image |
| Tags | `post.tags` | Tag chips (link to tag pages) |
| Excerpt | `post.excerpt` | Meta description + OG/Twitter description |

**Required at publish:** title, one primary category, byline, featured image
(with alt text), excerpt. **Recommended:** tags for discoverability.

**Gap:** the *updated* date and any correction note are not rendered visibly
today — only in metadata. If the corrections policy in §3 is adopted, the
front-end needs a visible "Updated" timestamp and/or a correction block (§6).

## 6. Technical follow-ups

Captured per the NOA-24 AC ("technical implications … captured as follow-up
tasks if needed"):

1. **Visible "Updated" timestamp + correction note on article pages.** Render
   `post.updatedAt` when it meaningfully post-dates `publishedAt`, and add a
   structured correction/update block (dated) editors can populate — so the
   visible note matches the JSON-LD `dateModified` we already emit. → *new
   ticket.*
2. **(Optional) Editorial fields for corrections in WordPress.** A custom field
   / block for "correction note" so the note is structured data rather than
   free-text in the body, enabling consistent rendering and future audit. →
   *new ticket, depends on (1).*

Revalidation/search/cache themselves need **no** new work — publish, update, and
delete all already flow through the webhook to both the Next.js cache tags and
the Supabase content index (§2–§4).

## Summary

- **Publish/update/correct = edit in WordPress and save.** The webhook does the
  rest (cache revalidation + search sync) automatically, edition-scoped.
- **Update the same post; don't duplicate** — engagement and search key on
  `(edition_code, wp_post_id)`.
- **Corrections should carry a visible dated note** (editorial policy); the
  machine-readable `dateModified` is already emitted, the visible note is the
  follow-up in §6.
- Ticket links/comments to **NOA-4** (editorial epic) as required by the AC.
