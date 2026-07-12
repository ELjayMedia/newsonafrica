# Google Play listing & data-safety content pack (NOA-133)

Paste-ready copy and questionnaire answers for the News on Africa Play Console
submission. Everything here reflects the app's **actual** behaviour (verified
against the codebase 2026-07-12) — no placeholder claims. Items only you can
provide (visual assets, account, final contact email) are marked **[YOU]**;
policy gaps that need a decision/build before submission are marked **⚠️**.

---

## 1. Store listing — text

**App name (≤30 chars):** `News on Africa`

**Short description (≤80 chars):**
`Independent pan-African news — Eswatini, South Africa & Nigeria editions.`

**Full description (≤4000 chars):**

> News on Africa is an independent pan-African news service bringing you the
> stories that matter across the continent — with dedicated editions for
> Eswatini, South Africa and Nigeria.
>
> **Read across editions.** Switch between country editions or browse the
> pan-African view for headlines in business, politics, culture and the creative
> economy.
>
> **Save what matters.** Create a free account to bookmark articles and pick up
> reading where you left off.
>
> **Join the conversation.** Comment on stories, reply to other readers, and
> report anything that breaks the rules — comments are moderated.
>
> **Search everything.** Full-text search across every edition finds the story
> you're looking for fast.
>
> **Made for mobile.** Fast, clean reading with a bottom nav built for one
> thumb, and offline fallback so a dropped signal doesn't drop your page.
>
> **Stay informed.** Subscribe to The Africa Brief, our weekly newsletter of
> business and creative-economy stories.
>
> News on Africa is committed to independent journalism and clear labelling of
> any sponsored content.

**Category:** News & Magazines
**Tags/keywords:** African news, Eswatini news, South Africa news, Nigeria news,
business, culture

**[YOU] Contact details**
- Support email: **⚠️ confirm** — the privacy page currently uses
  `privacy@newsonafrica.com`; use a monitored inbox.
- Website: `https://app.newsonafrica.com` (after NOA-121)
- Privacy policy URL: `https://app.newsonafrica.com/privacy` (live — NOA-135)

## 2. Graphic assets — **[YOU]**

Play requires (I can write exact specs/alt text, but the images are yours):
- **App icon** 512×512 — reuse `public/icons/icon-512.png`.
- **Feature graphic** 1024×500 — **needed** (brand green, wordmark). ⚠️ to create.
- **Phone screenshots** ×2–8 (min 320px, 16:9 or 9:16) — home, an article,
  search, saved articles, comments. Capture from the live app after NOA-121.
- (Optional) 7" / 10" tablet screenshots.
No placeholder or mocked screenshots — capture from the real app.

## 3. Data safety questionnaire

The app collects the following, **all first-party** (stored in Supabase). **No
data is shared with third parties, sold, or used for third-party ads/analytics**
(there is no third-party ad or analytics SDK in the app). Everything is
**encrypted in transit** (HTTPS/TLS).

| Data type (Play category) | Collected | Why | What it is |
| ------------------------- | --------- | --- | ---------- |
| **Name** (Personal info) | Yes (optional) | App functionality, Account management | Profile display name |
| **Email address** (Personal info) | Yes (required for account) | App functionality, Account management | Sign-in identity; newsletter |
| **Photos** (Photos and videos) | Yes (optional) | App functionality | Profile avatar you upload |
| **App interactions** (App activity) | Yes | App functionality, Analytics | Bookmarks; searches |
| **Search history** (App activity) | Yes | Analytics, App functionality | Search terms (logged without your identity) |
| **Other user-generated content** (App activity) | Yes | App functionality | Comments you post |

**Answer "No / not collected" for:** precise or approximate **location** (the
profile "country" is a self-selected text preference, not device location),
financial info, health & fitness, messages (comments are public UGC, not private
messages), contacts, calendar, web browsing history, device/other IDs for
tracking.

**Security section answers:**
- Is data encrypted in transit? **Yes.**
- Can users request that data be deleted? **⚠️ Yes — but see §6.** Google requires
  an account/data-deletion pathway; there is no in-app "delete account" flow yet.
- Data collection is **required** for account features and **optional** for
  browsing (you can read without an account).

## 4. Content rating questionnaire (IARC)

Answer honestly; IARC computes the rating. Guidance for a news app with UGC:
- App type: **News / information app.**
- Violence, sexual content, profanity, gambling, drugs **in the app's own
  content:** none — but news articles may reference real-world events. Answer the
  "does the app contain news/journalistic content" path truthfully.
- **User-generated content / user interaction:** **Yes** — readers post and reply
  to comments. This typically pushes the rating to **Teen**-equivalent and
  requires the moderation + reporting disclosures below.
- Users can share content: comments are visible to other users. Location sharing:
  **No.**

Expected outcome: a Teen-level rating (PEGI 12 / ESRB Teen or similar). Confirm
via the questionnaire result.

## 5. App content declarations

- **News app:** Yes — declare as a news app if prompted.
- **User-generated content:** Yes. Moderation exists (`/account/admin/comments`
  — approve/hide/delete) and readers can **report** comments (NOA-23), which is
  the Play requirement for UGC apps. State that UGC is moderated and reportable.
- **Ads:** **No** — the app shows no third-party ads today (ad units are unfilled
  placeholders; no ad SDK). Revisit if/when real ad serving ships.
- **Target audience & age:** 13+; **not** directed at children. Do not opt into
  the Designed for Families programme.
- **App access:** Core reading is public; bookmarking, commenting and profile
  need a free account. Provide Play review with a **[YOU] test account**
  (email + password) so reviewers can exercise the gated features, or note that
  self-registration is open.
- **Data deletion:** provide the deletion method — see §6.

## 6. ⚠️ Pre-submission gaps to close

1. **Account / data deletion (Play policy).** Google requires either an in-app
   "delete account" action or a public deletion-request URL. Today the app has
   neither (only per-comment soft-delete). **Options:** (a) I build a simple
   in-app "Delete my account" flow + a `/privacy`-linked deletion request, or
   (b) you commit to a monitored `privacy@newsonafrica.com` deletion process and
   document it on the privacy page. Recommend (a) before launch — I can do it.
2. **Feature graphic + real screenshots** — needs the live domain (NOA-121) and
   your brand asset.
3. **Confirm the support/privacy email.**
4. **Nigeria edition** should be serving real content (NOA-121 NG env overrides)
   before you screenshot `/ng`.

---

**Dependencies:** most of this can be entered once **NOA-121** (live domain) and
**NOA-136** (signed AAB + asset links) are done. The text and questionnaire
answers above are ready to paste now; the visual assets, test account, and the
data-deletion decision (§6) are the remaining blockers.
