# UX Triage & Optimisation Report — October 2026

Scope: the Next.js 15 app in this repository (`app/`, `components/`, `lib/`), inspected at commit `d3b56c4`.
Method: source review of every public template, plus a production build (`pnpm build`) run against the
repo's WordPress fixture stub (`e2e/fixtures/wp-stub.mjs`) and audited with a Playwright script at
360×780 (entry-level Android width) and 1280×900, light and dark colour schemes.

**Evidence labels used throughout**

- **Observed** — reproduced in the running build or read directly in code.
- **Inferred** — follows from code but not measured (e.g. no field data available).
- **Hypothesis** — plausible, needs audience research or analytics before acting.

Limits: the fixture serves placeholder posts with no images, so image weight, LCP and real CMS markup were
**not** measured. No RUM/CrUX data, analytics or user testing was available. Competitor comparison
(section C) is pattern-level and was not re-inspected live in this session.

---

## A. Executive UX assessment

**Overall.** The platform is a lean, modern foundation with good instincts (lightweight JS, explicit mobile
ad policy, trust metadata, structured data) that was let down by one critical theming defect and a handful of
"design-mock leftovers": controls and labels that look functional or truthful but are not. Those leftovers
matter more than polish for a news brand whose main asset is credibility.

**Top strengths (observed)**

1. **Light JavaScript.** 102 kB shared first-load JS; 106 kB for home/category, 132 kB for articles. No
   third-party tag scripts. Fonts are self-hosted through `next/font` with `display: swap`.
2. **Explicit, reader-first mobile ad policy** (`docs/mobile-ad-behavior.md`): no ad before content, no
   interstitials, no sticky bottom units, conservative density. Unfilled `AdSlot` inventory collapses (NOA-180).
3. **Trust scaffolding exists:** author links, published + "Updated" timestamps with a revision threshold,
   correction notices, sponsored-article disclosure, editorial guidelines page, `NewsArticle` +
   `BreadcrumbList` JSON-LD, canonical URLs.
4. **Mobile chrome:** bottom navigation with safe-area padding, 64px tall targets, no horizontal scroll at
   360px, WhatsApp share prioritised in the compact mobile share row.
5. **Resilience:** degraded states when WordPress or Supabase fail, a service worker with `offline.html`,
   route-level `loading.tsx` skeletons, and a comprehensive e2e smoke suite.

**Top weaknesses**

1. **P0 — dark mode made article, category and search text unreadable** (light text on the fixed white
   content sheet; article headline 1.04:1). Fixed in this change.
2. **Trust leaks from placeholder UI:** fictional "Sponsored · News On Africa Partner" units in production
   feeds and articles; social icons that pointed to the x.com and facebook.com home pages; a
   "Personalized for you" label on a non-personalised list; a non-functional "Aa" control; fake filter tabs.
3. **WCAG 2.2 AA contrast failures** in the brand green when used for small text and for fills behind white
   text, and in the grey timestamp colour.
4. **Every responsive template is rendered twice** (mobile tree plus desktop tree, toggled with CSS), which
   doubles HTML weight on the slowest connections.
5. **Geographic information architecture is ambiguous:** "Home" in the nav goes to the Eswatini edition
   while the logo goes to the pan-African front; the lead-story headline on desktop is barely larger than the
   secondary cards.

**Immediate opportunities** (beyond what was shipped): get the primary-green colour change approved; gate the
fictional sponsored units; merge the duplicated mobile and desktop trees; clarify "Africa" vs edition
navigation.

---

## B. Prioritised UX triage backlog

Score = (User × Business × Confidence) ÷ Effort, each rated 1–5. The score is a decision aid. Severity can
override it: a P0 ranks first even when its score is lower than a P1's.

| #   | P   | Issue                                                                                                                                                                                                                                               | Location                                                                    | Evidence                                                                                 | U   | B   | C   | E   | Score | Status                                 | Recommendation / acceptance criteria                                                                                                          |
| --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --- | --- | --- | --- | ----- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P0  | Dark mode painted light semantic text on the fixed-white `.noa-well` sheet: article headline, body, share row, comments and related were invisible                                                                                                  | `app/globals.css` (`.noa-well`, noa-* tokens), all semantic-token templates | **Observed**: article H1 contrast 1.04:1 at 1280px dark (screenshot); mobile body 1.04:1 | 5   | 5   | 5   | 2   | 62.5  | **Fixed**                              | noa-* neutrals now redefined under `.dark`. AC: every audited text node ≥4.5:1 in dark; H1 19.06:1 after the fix                              |
| 2   | P1  | Fictional sponsored units render in production: hard-coded "News On Africa Partner" copy in the mobile home feed and in mobile article bodies. They have no link and no real advertiser, which contradicts the `SponsoredCard` contract and NOA-180 | `components/home/mobile-feed.tsx`, `components/article/article-body.tsx`    | **Observed** in the home and `/sz` mobile render                                         | 3   | 4   | 5   | 1   | 60    | **Open (needs monetisation sign-off)** | Gate them the same way `AdSlot` is gated (`enabled`, or real campaign data). AC: no sponsored unit renders unless a real campaign is attached |
| 3   | P1  | No bypass block. First Tab stop was "Subscribe", with a utility bar, masthead and nav before content (WCAG 2.4.1)                                                                                                                                   | `app/layout.tsx`                                                            | **Observed**                                                                             | 3   | 2   | 5   | 1   | 30    | **Fixed**                              | Skip link → `#main-content`. AC: Tab 1 = "Skip to content"; Enter focuses `<main>` (verified)                                                 |
| 4   | P1  | Timestamp/meta grey `#9a9591` at 2.97:1 for 12px text (WCAG 1.4.3)                                                                                                                                                                                  | `--noa-faint`                                                               | **Observed** on all feeds                                                                | 3   | 2   | 5   | 1   | 30    | **Fixed**                              | Token set to `#76716c` (4.83:1)                                                                                                               |
| 5   | P1  | Green eyebrows and active nav item at 3.69:1 for 12px text                                                                                                                                                                                          | story/hero eyebrows, header nav                                             | **Observed**                                                                             | 3   | 2   | 5   | 1   | 30    | **Fixed**                              | New `--noa-green-text` token: `#117f3d` light (5.09:1), `#1bb257` dark (7.16:1). The logo and fills keep brand green                          |
| 6   | P1  | Placeholder social links: "News On Africa on X" pointed to `https://x.com`                                                                                                                                                                          | `components/site-header.tsx`                                                | **Observed**                                                                             | 2   | 3   | 5   | 1   | 30    | **Fixed**                              | Driven by an empty `SOCIAL_PROFILES` list until the newsroom supplies real handles                                                            |
| 7   | P1  | Category page (mobile) showed "Latest / Top stories / Analysis" pills that look like tabs but are inert `<span>`s                                                                                                                                   | `app/[countryCode]/category/[slug]/page.tsx`                                | **Observed**                                                                             | 3   | 2   | 5   | 1   | 30    | **Fixed**                              | Removed. Reintroduce only with real filtering                                                                                                 |
| 8   | P1  | Lead-story headline weak on desktop: `clamp(1.125rem,1.5vw,1.625rem)` ≈ 19px at 1280px vs 18px secondary cards                                                                                                                                      | `components/home/hero-lead.tsx`                                             | **Observed** (screenshot)                                                                | 3   | 4   | 4   | 2   | 24    | Open (proposal D1)                     | Step the hero headline up to ~28–34px. AC: in a 5-second test, ≥80% of participants identify the top story                                    |
| 9   | P1  | Primary-green fills behind white text fail AA: Subscribe CTA 3.69:1, category `Badge` / "Back to home" / filter pills 3.16:1                                                                                                                        | `--primary`, `--noa-green` fills                                            | **Observed**                                                                             | 3   | 3   | 5   | 2   | 22.5  | **Open (brand approval)**              | Darken the fill green to ~`#117f3d`/`#15803d`. AC: all button and badge text ≥4.5:1                                                           |
| 10  | P1  | Breaking/live flag only shown on the desktop hero; mobile lead had none                                                                                                                                                                             | `mobile-feed.tsx`                                                           | **Observed** in code                                                                     | 3   | 4   | 4   | 2   | 24    | **Fixed**                              | Mobile lead now shows the same tag-driven LIVE/BREAKING flag, as text (works with images off)                                                 |
| 11  | P1  | "Personalized for you" label on the rail's plain latest list                                                                                                                                                                                        | `components/home/home-rail.tsx`                                             | **Observed**: `getHomeRailData` is not user-scoped                                       | 2   | 2   | 5   | 1   | 20    | **Fixed**                              | Label removed                                                                                                                                 |
| 12  | P1  | Non-functional "Aa" text-size control on the mobile article                                                                                                                                                                                         | `mobile-article-reader.tsx`                                                 | **Observed**: a `<span>`, not a control                                                  | 2   | 2   | 5   | 1   | 20    | **Fixed**                              | Replaced with a spacer. See D3 for whether to build the feature                                                                               |
| 13  | P1  | Geographic IA ambiguity: nav "Home" → `/sz` (Eswatini) while the logo → `/` (pan-African); on `/` nothing in the nav is active and the switcher reads "Edition"                                                                                     | `site-header.tsx`, `bottom-navigation.tsx`                                  | **Observed**                                                                             | 3   | 3   | 4   | 2   | 18    | Open (proposal D2)                     | Label the pan-African front "Africa" and the edition by name. AC: in tree testing, ≥80% find "news in my country" first time                  |
| 14  | P1  | Article LCP image not prioritised                                                                                                                                                                                                                   | article page + mobile reader                                                | **Observed** in code                                                                     | 4   | 3   | 4   | 1   | 48    | **Fixed**                              | `loading="eager"` + `fetchPriority="high"`                                                                                                    |
| 15  | P1  | Every template double-renders (mobile + desktop trees in the same HTML): two `<h1>`s per article, two comment sections, two body copies                                                                                                             | article, home, category pages                                               | **Observed**: `h1` count 2; 93 KB of HTML for a one-line stub article                    | 3   | 3   | 5   | 4   | 11.3  | Open (strategic)                       | One responsive tree. AC: article HTML ≤ ~55% of today's for the same post; one `<h1>`                                                         |
| 16  | P1  | CMS images served as raw `<img>` with no `srcset`/`sizes`, so phones download originals                                                                                                                                                             | all cards and heroes                                                        | **Inferred** (fixture has no images)                                                     | 4   | 3   | 3   | 3   | 12    | Open                                   | Use WordPress intermediate sizes or an image CDN with `srcset`. AC: mobile card thumbnails ≤ 30 KB                                            |
| 17  | P2  | Article H1 is 24px (`heading-lg`) on all breakpoints, smaller than homepage heds                                                                                                                                                                    | article page, mobile reader                                                 | **Observed**                                                                             | 3   | 3   | 3   | 1   | 27    | Open (editorial review)                | 28px mobile / 36–40px desktop, Archivo 800, `text-wrap: balance`                                                                              |
| 18  | P2  | Article meta reads "Source: News on Africa · Publisher: News on Africa" and has no content-type label (News / Analysis / Opinion)                                                                                                                   | `mobile-article-reader.tsx`                                                 | **Observed**                                                                             | 2   | 3   | 4   | 2   | 12    | Open                                   | Drop the duplicate; add a content-type label from a WP taxonomy                                                                               |
| 19  | P2  | Mobile image caption reuses `alt` text; there is no photo credit field                                                                                                                                                                              | `mobile-article-reader.tsx`                                                 | **Observed**                                                                             | 2   | 3   | 4   | 3   | 8     | Open                                   | Map WP `caption` and credit fields; keep `alt` for screen readers only                                                                        |
| 20  | P2  | Mobile homepage has no exposed `<h1>` (the desktop hero `<h1>` is `display:none` below `lg`)                                                                                                                                                        | `app/(home)/page.tsx`                                                       | **Observed**                                                                             | 2   | 1   | 5   | 1   | 10    | Open                                   | Add an sr-only page `<h1>`, or make the mobile lead the `<h1>`                                                                                |
| 21  | P2  | Search country filter offered the non-public Nigeria edition                                                                                                                                                                                        | `app/search/page.tsx`                                                       | **Observed**                                                                             | 2   | 2   | 5   | 1   | 20    | **Fixed**                              | Uses `PUBLIC_COUNTRY_LIST`, matching the switcher                                                                                             |
| 22  | P2  | "Copied" feedback on share not announced to screen readers                                                                                                                                                                                          | `share-buttons.tsx`                                                         | **Observed**                                                                             | 2   | 1   | 5   | 1   | 10    | **Fixed**                              | `aria-live="polite"`                                                                                                                          |
| 23  | P2  | 404 and error pages are dead ends (one button)                                                                                                                                                                                                      | `app/not-found.tsx`, `app/error.tsx`                                        | **Observed**                                                                             | 2   | 2   | 4   | 1   | 16    | Open                                   | Add a search box, edition links and latest stories                                                                                            |
| 24  | P2  | Primary nav = top-5 WordPress categories by post count; no Opinion/Analysis or region entry                                                                                                                                                         | `lib/nav.ts`                                                                | **Observed**; demand **Hypothesis**                                                      | 3   | 4   | 3   | 3   | 12    | Open (research)                        | Validate against analytics and editorial capacity first (section H)                                                                           |
| 25  | P3  | Footer has no sections, editions or corrections-policy links                                                                                                                                                                                        | `site-footer.tsx`                                                           | **Observed**                                                                             | 2   | 3   | 3   | 2   | 9     | Open                                   | Add an editions and sections column and a corrections-policy link                                                                             |
| 26  | P3  | Hamburger and theme toggle use Unicode glyphs (☰ ☾), which render inconsistently on low-end Android fonts                                                                                                                                          | header                                                                      | **Inferred**                                                                             | 1   | 1   | 3   | 1   | 3     | Open                                   | Inline SVG icons, as the bottom nav already does                                                                                              |

Contrast notes: the audit script flagged the utility-bar strapline (1.07:1) and the bottom-nav labels (3.97:1).
Both are false positives: the script cannot parse translucent `color-mix` values. The real values are
white/70 on `#0c0c0c` and `#6e6a66` on white (5.3:1).

---

## C. Competitor benchmark (pattern level)

Based on publicly known, stable patterns of these publishers. Not re-inspected live in this session, so
treat it as a hypothesis list to confirm.

| Pattern                                                              | Seen at                                             | NOA today                                                    | Transferable lesson                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Unambiguous lead story: one dominant headline + image above the fold | BBC News, Reuters, News24, Nation Africa            | Lead headline ≈ secondary size on desktop (#8)               | Size contrast, not more stories, signals priority                                 |
| Edition/region as first-class nav ("Africa", country tabs)           | BBC (Africa), AllAfrica (country index), Africanews | Edition `<select>`; "Home" means Eswatini (#13)              | Name the scope ("Africa", "Eswatini") wherever it changes                         |
| Live/breaking strip                                                  | BBC, News24, The Punch                              | Tag-driven flag on the lead only                             | Keep it editor-controlled; add a dismissible strip only for genuine breaking news |
| Content-type labels (Analysis, Opinion, Sponsored)                   | FT, The Guardian, Daily Maverick                    | Sponsored only (#18)                                         | Label opinion and analysis explicitly to protect trust                            |
| Lightweight mobile article with share-to-WhatsApp                    | News24, Premium Times                               | Strong: compact row leads with WhatsApp                      | Keep. Measure share-to-visit return traffic                                       |
| Clear sponsored treatment that is visibly different from editorial   | FT, Daily Maverick                                  | Good visual treatment, but placeholder campaigns live (#2)   | Never show a sponsored unit without a real sponsor                                |
| Corrections and policy pages linked from articles                    | Reuters, The Guardian                               | Correction notice component exists; no policy link in footer | Link the policy from the correction notice and the footer                         |

---

## D. Proposed UX improvements (need approval: layout-affecting)

- **D1 Homepage hierarchy.** Hero headline steps up to ~28px (mobile) and 34px (desktop), with the standfirst
  kept. Keep 2 secondary cards; promote "Explore Africa" above "Latest across the continent" on mobile.
  _Trade-off:_ about one fewer story above the fold on 1280px.
- **D2 Geographic IA.** Nav item 1 becomes **"Africa"** (`/`), then the current edition name (e.g.
  **"Eswatini"**), then the sections. The bottom nav "Home" keeps going to the reader's edition but its label
  becomes the edition name. _Trade-off:_ longer labels; validate with a tree test (section H).
- **D3 Reading tools.** Do **not** build text-size controls yet: browser zoom and OS font scaling already
  work with this rem-based CSS. Re-evaluate after measuring scroll depth. Reading-time and save-for-later
  already partly exist (bookmarks).
- **D4 Single responsive tree** for article, home and category (backlog #15). This is the biggest
  low-bandwidth win and also removes the duplicate `<h1>` and duplicate comment fetches.
- **D5 Images.** `srcset`/`sizes` from WordPress media sizes; set width and height attributes; blur-up or
  dominant-colour placeholders instead of the green gradient.

---

## E. Design system recommendations

- **Colour.** Keep the brand green `#15994a` for the logo, rules and large display text. Use
  `--noa-green-text` (added) for text under 18.66px bold, and move fills behind white text to `#117f3d`
  (needs approval, #9). The noa-* neutrals now have dark values; new components must use tokens, never fixed
  hex, unless their surface is fixed too (e.g. the sponsored cream card).
- **Typography.** The scale lacks an article display step: add `display-article` (28px mobile / 40px
  desktop, line-height 1.1, Archivo 800). Body copy at 17px / 1.75 is good; cap the measure at about 68ch.
- **Spacing.** Standardise on a 4px base with section gaps of 24, 32 and 40px. The home and category pages
  currently mix `space-y-5`, `space-y-8` and `space-y-10`.
- **Components.** Merge `StoryCard`, `ThumbRow`, `FeedRow`, `ArticleCard` and `SearchResultCard` into one
  card with `variant` props (lead / standard / row / compact). Category pills and eyebrows should share one
  component.
- **States.** Every interactive element gets visible `:focus-visible` (already global), a hover state and a
  minimum 24×24px target (WCAG 2.5.8). Inline 12px category pills are 21px tall, which is allowed by the
  inline exception but better at ≥24px.

---

## F. Implementation roadmap

**Immediate (done in this change)**: #1, #3, #4, #5, #6, #7, #10, #11, #12, #14, #21, #22.

**Short-term (1–2 sprints, mostly small)**

1. #2 gate fictional sponsored units (needs commercial sign-off).
2. #9 fill-green contrast (needs brand sign-off).
3. #17 article display headline; #20 home `<h1>`; #18 meta cleanup; #23 helpful 404/error pages; #26 SVG icons.
4. D1 hero hierarchy and D2 geographic labels, after a quick 5-second test and tree test.

**Strategic (quarter)**

1. D4 single responsive tree, measured against today's HTML size and INP.
2. D5 responsive images plus RUM: wire `web-vitals` into the existing `/api/analytics/page-view` beacon and
   report p75 LCP, INP and CLS per edition and device class.
3. Content-type taxonomy (News, Analysis, Opinion, Sponsored) and an IA revision driven by analytics (#24).

---

## G. Verification report

| Check                                                                         | Before                                               | After                                        |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `pnpm typecheck`                                                              | pass                                                 | pass                                         |
| `pnpm lint`                                                                   | —                                                    | no warnings or errors                        |
| `pnpm test` (Vitest)                                                          | —                                                    | 206 / 206 pass                               |
| `pnpm build`                                                                  | pass; article 132 kB first-load JS                   | pass; article 132 kB (no JS growth)          |
| Playwright e2e (16 specs, desktop + Pixel 7)                                  | —                                                    | 16 / 16 pass                                 |
| Article H1 contrast, dark, desktop                                            | **1.04:1**                                           | **19.06:1**                                  |
| Text nodes under AA on `/sz` mobile, light (excluding script false positives) | every timestamp (2.97:1) + sponsored label (3.47:1)  | 0                                            |
| Sponsored card text, dark                                                     | 1.03:1 (after the token change, before the card fix) | 18.06:1 (fixed ink on a fixed cream surface) |
| First Tab stop (all audited pages)                                            | "Subscribe"                                          | "Skip to content" → focuses `<main>`         |
| Horizontal overflow at 360px                                                  | none                                                 | none                                         |
| Article HTML (stub post)                                                      | 93,827 B                                             | 93,516 B                                     |

Visual comparison: before and after screenshots at 360 and 1280px, light and dark, for home, `/sz`,
article, category, search and 404 were reviewed. Light mode is unchanged apart from slightly darker
timestamps and labels. Dark mode now renders a coherent dark sheet.

**Not verified:** real-device performance on entry-level Android, Core Web Vitals (no field data, and no
images in the fixture), screen-reader passes (VoiceOver and TalkBack), and editorial review of copy changes.
SEO surfaces (canonicals, metadata, JSON-LD) were not touched.

---

## H. Research gaps

1. **Field performance.** p75 LCP, INP and CLS by country and device class. No RUM is wired up yet.
2. **Audience geography and referral mix.** What share arrives from WhatsApp, Facebook and search, per
   edition? This should drive D2 and the share-row order.
3. **Navigation demand.** Which sections do readers seek? This needs a tree test and search-log analysis
   before revising the 5-category nav.
4. **Dark-mode usage.** How many readers use it? It decides how much to invest in the dark palette beyond
   legibility.
5. **Data-cost sensitivity.** Would a "lite" mode (images on tap) be used? Validate with a small panel in
   Eswatini and South Africa before building.
6. **Trust signals.** Do readers notice author, update and corrections cues? Run a quick moderated test
   with 5–8 readers per edition.

---

## Follow-up: text, button and spacing pass

Measured at 360px (mobile) and 1280px (desktop) against the same fixture build. All checks still pass:
typecheck, lint, 206 unit tests, 16/16 e2e. First-load JS is unchanged.

| Area                                                             | Before                                            | After                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Form fields (search, newsletter, login, comment, edition picker) | 14px on mobile, so iOS Safari zooms on focus      | 16px below `md`, 14px from `md` up                                                                                        |
| `Button` sizes                                                   | 40 / 36 / 40px (default / sm / icon)              | 44 / 40 / 44px on mobile; unchanged from `md` up                                                                          |
| Footer and auth-page links                                       | 17px tall, wrapped inline                         | 44px rows (two columns on phones), inline from `sm`                                                                       |
| Compact share links (mobile article)                             | 17px                                              | 44px                                                                                                                      |
| Bookmark "Save", article tag pills                               | 36px, 31px                                        | 44px, 40px on mobile                                                                                                      |
| Pagination, search country filters                               | 36px, 32px                                        | 44px, 40px on mobile                                                                                                      |
| Hamburger / theme toggle                                         | 40px                                              | 44px                                                                                                                      |
| Article `<h1>`                                                   | 24px everywhere                                   | `display-article`: 28px mobile, 40px desktop, Archivo 800                                                                 |
| Desktop lead headline                                            | ≈19px (barely above 18px cards)                   | ≈30px at 1280px                                                                                                           |
| Mobile home page heading                                         | none exposed                                      | sr-only `<h1>Latest news</h1>`                                                                                            |
| Article body measure                                             | unbounded (`max-w-none`)                          | capped at 68ch; subheads in the display face; `text-wrap: pretty` on paragraphs and `balance` on headings; long URLs wrap |
| Page gutters                                                     | `Container` added `lg:px-8`, 8px off the masthead | matches the masthead `px-4 / sm:px-6`; content aligns with the logo                                                       |

Still open: the primary-green fills behind white text (#9, needs brand approval). The 12px category pills
(21px tall) are left as they are: they pass WCAG 2.5.8 through its spacing exception.

---

## Follow-up: article page

The previous build and this one were measured side by side against a realistic demo article (scratch stub
with 9 paragraphs, two subheads, a pull quote and a featured image). The repo fixture is unchanged.

| Change                                                                                                           | Why                                                                                                                                       | Result                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| One responsive article tree replaces the separate mobile and desktop trees (`mobile-article-reader.tsx` removed) | Backlog #15: duplicated HTML, two `<h1>`s, two comment sections                                                                           | Demo article HTML 111.5 KB → 82.3 KB (−26%); one `<h1>`; one body copy       |
| Visible breadcrumb (Edition › Section) replaces the "← NOA" bar and the category badge                           | Orientation: which edition and section the reader is in                                                                                   | One-tap route back to the edition or section                                 |
| Standfirst (`excerpt`) shown under the headline                                                                  | Article introduction was missing on article pages                                                                                         | Matches the hierarchy of major publishers                                    |
| Byline on two lines: "By Author" / date · updated · _n_ min read, plus one publisher line                        | Replaces a stacked four-line block and the duplicate "Source / Publisher" pair (backlog #18); keeps the Play-policy publisher attribution | Reading time comes from `lib/article/reading-time.ts` (200 wpm, unit-tested) |
| Alt text no longer printed as a caption                                                                          | Backlog #19: alt text is for screen readers, not a caption                                                                                | Still exposed to assistive tech                                              |
| Featured image full-bleed on phones, rounded from `sm`                                                           | More image per screen on small devices                                                                                                    | Also gets `width`/`height` when WordPress provides them                      |
| Article end: "Topics" list, a second share row, related stories, then comments                                   | Gives finished readers an obvious next step; related stories had sat below comments on desktop                                            | —                                                                            |
| Related stories as thumbnail rows (`ArticleCard` `list` variant)                                                 | Three tall stacked cards took about three phone screens                                                                                   | Mobile demo page 4,410px → 3,756px                                           |
| Rail no longer lists the article being read                                                                      | It appeared as "Latest News" on its own page                                                                                              | —                                                                            |

Verification: typecheck, lint, 210 unit tests (4 new). Playwright e2e: 16/16 in four consecutive runs, one of
them from a cold start. The first run after rebuilding had one failure in `article.spec.ts` ("Updated" line).
It did not reproduce and its error output was not captured. The spec now asserts a single "Updated" line,
since there is one article tree.

Unchanged by design: the mobile in-article sponsored units (#2, awaiting monetisation sign-off) and the colour
of the primary-green fills (#9).
